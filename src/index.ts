import { google } from "googleapis";
import mysql from "mysql2/promise";
import * as fs from "fs";
import { exec } from "child_process";
import * as dotenv from "dotenv";
import * as path from "path";
import env from "./config/env";

dotenv.config();

// Carrega a chave da conta de serviço
const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(__dirname, "auth/bakuf-444514-9c394ba037e6.json"), // Caminho para o arquivo JSON da conta de serviço
  scopes: ["https://www.googleapis.com/auth/drive"],
});

// Configura o cliente do Google Drive
const drive = google.drive({ version: "v3", auth });

async function getPersonalDatabases(): Promise<string[]> {
  const connection = await mysql.createConnection({
    host: env.MYSQL_HOSTNAME,
    user: env.MYSQL_USERNAME,
    password: env.MYSQL_PASSWORD,
  });

  const [rows]: any = await connection.query(
    "SHOW DATABASES WHERE `Database` NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')"
  );

  await connection.end();

  return rows.map((row: any) => row.Database);
}

// Função para criar o backup do MySQL
async function createBackup(): Promise<string> {
  const databases = await getPersonalDatabases();

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

// Função para fazer upload para o Google Drive
async function uploadToDrive(filePath: string) {
  try {
    const fileMetadata = {
      name: path.basename(filePath), // Nome do arquivo
      parents: ["1zjay9pS91_UpE1atx6FzqyhyrSw6gPtX"], // ID da pasta no Google Drive
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

    console.log("Arquivo enviado com sucesso. ID:", res.data.id, new Date);

    // Remove o arquivo local após o upload
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Erro ao enviar o arquivo:", err);
  }
}

// Função principal
(async () => {
  try {
    const filePath = await createBackup();
    await uploadToDrive(filePath);
  } catch (error) {
    console.error(`${env.MYSQL_HOSTNAME},${env.MYSQL_NAME},${env.MYSQL_PASSWORD}\n\nErro:`, error);
  }
})();
