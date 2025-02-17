import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import drive from "../loaders/drive";

// Caminho da pasta local
const localFolderPath = path.resolve(os.homedir(), "Documentos");
const driveParentFolderId = "1sjDLOGWox4Hf6GaUvXGfxbUvBMm-q1Bw"; // ID da pasta no Google Drive

// Função para buscar um arquivo/pasta no Drive pelo nome
async function findItemInDrive(name: string, parentId: string): Promise<string | null> {
  try {
    const res = await drive.files.list({
      q: `name='${name}' and '${parentId}' in parents and trashed=false`,
      fields: "files(id, name)",
    });
    const items = res.data.files || [];
    return items.length > 0 ? items[0].id || null : null;
  } catch (err) {
    console.error("Erro ao buscar item no Drive:", err);
    return null;
  }
}

// Função para criar ou obter uma pasta no Drive
async function createOrGetFolder(name: string, parentId: string): Promise<string> {
  // Verifica se a pasta já existe
  const existingFolderId = await findItemInDrive(name, parentId);
  if (existingFolderId) {
    return existingFolderId;
  }

  // Se não existir, cria a pasta
  try {
    const res = await drive.files.create({
      requestBody: {
        name: name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
    });
    return res.data.id || "";
  } catch (err) {
    console.error("Erro ao criar pasta no Drive:", err);
    throw err;
  }
}

// Função para fazer upload de um arquivo (ignora se existir)
async function uploadFileToDrive(filePath: string, fileName: string, parentId: string) {
  try {
    // Verifica se o arquivo já existe
    const existingFileId = await findItemInDrive(fileName, parentId);

    // Se existir, ignora o upload
    if (existingFileId) {
      return;
    }

    // Faz o upload do arquivo
    const media = {
      mimeType: "application/octet-stream",
      body: fs.createReadStream(filePath),
    };

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentId],
      },
      media: media,
      fields: "id",
    });
  } catch (err) {
    console.error("Erro ao enviar arquivo:", err);
    return null
  }
}

// Função recursiva para percorrer diretórios e fazer upload
async function uploadFolderToDrive(localPath: string, driveParentId: string) {
  const items = fs.readdirSync(localPath);

  for (const item of items) {
    const itemPath = path.join(localPath, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      // Verifica ou cria a pasta no Drive
      const folderId = await createOrGetFolder(item, driveParentId);
      await uploadFolderToDrive(itemPath, folderId); // Processa recursivamente
    } else {
      // Se for um arquivo, faz o upload
      await uploadFileToDrive(itemPath, item, driveParentId);
    }
  }
}

// Função principal
const folderBackup = async () => {
  try {
    await uploadFolderToDrive(localFolderPath, driveParentFolderId);
    console.log("Upload concluído com sucesso!",new Date,'\n --- \n');
  } catch (err) {
    console.error("Erro durante o upload:", err);
    return null
  }
};

export default folderBackup;
