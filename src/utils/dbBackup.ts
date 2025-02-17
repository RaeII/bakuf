import mysql from "mysql2/promise";
import * as fs from "fs";
import { exec } from "child_process";
import * as path from "path";
import env from "../config/env";
import drive from "../loaders/drive";

// Função para listar arquivos na pasta do Google Drive
async function listFilesInFolder(folderId: string): Promise<any[]> {
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, createdTime)",
      orderBy: "createdTime",
    });
    return res.data.files || [];
  } catch (err) {
    console.error("Erro ao listar arquivos:", err);
    return [];
  }
}

// Função para deletar um arquivo no Google Drive
async function deleteFile(fileId: string) {
  try {
    await drive.files.delete({ fileId });
    console.log(`Arquivo deletado. ID: ${fileId}`);
  } catch (err) {
    console.error("Erro ao deletar arquivo:", err);
  }
}

// Função para criar o backup do MySQL
async function createBackup(): Promise<string> {
  const connection = await mysql.createConnection({
    host: env.MYSQL_HOSTNAME,
    user: env.MYSQL_USERNAME,
    password: env.MYSQL_PASSWORD,
  });

  const [rows]: any = await connection.query(
    "SHOW DATABASES WHERE `Database` NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')"
  );

  await connection.end();

  const databases = rows.map((row: any) => row.Database);

  if (databases.length === 0) {
    throw new Error("Nenhum banco de dados pessoal encontrado.");
  }

  const fileName = `backup_${new Date().toISOString().slice(0, 10)}.sql`;
  const filePath = path.resolve(__dirname, "../backup", fileName);

  const command = `mysqldump -u ${env.MYSQL_USERNAME} -p${env.MYSQL_PASSWORD} --databases ${databases.join(" ")} > ${filePath}`;

  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) {
        reject(`Erro ao criar o backup: ${error.message}`);
      } else {
        resolve(filePath);
      }
    });
  });
}

// Função para fazer upload para o Google Drive com gerenciamento de backups antigos
async function uploadToDrive(filePath: string) {
  const folderId = "1zjay9pS91_UpE1atx6FzqyhyrSw6gPtX"; // ID da pasta no Google Drive
  try {
    // Lista arquivos existentes na pasta
    const files = await listFilesInFolder(folderId);

    // Deleta os arquivos mais antigos se houver mais de 5
    if (files.length >= 5) {
      const filesToDelete = files.slice(0, files.length - 4); // Mantém os 4 mais recentes
      for (const file of filesToDelete) {
        if (file.id) {
          await deleteFile(file.id);
        }
      }
    }

    // Faz o upload do novo arquivo
    const fileMetadata = {
      name: path.basename(filePath), // Nome do arquivo
      parents: [folderId], // ID da pasta no Google Drive
    };
    const media = {
      mimeType: "application/sql",
      body: fs.createReadStream(filePath),
    };

    const res = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
    });

    console.log("Arquivo enviado com sucesso. ID:", res.data.id, new Date());

    // Remove o arquivo local após o upload
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Erro ao enviar o arquivo:", err);
    return null
  }
}

// Função principal
const dbBauckup = async () => {

    const filePath = await createBackup();
    await uploadToDrive(filePath);

}

export default dbBauckup
