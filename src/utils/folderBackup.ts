import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import drive from "../loaders/drive";
import archiver from "archiver"; // adicionada
import crypto from "crypto";    // adicionada

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

    console.log("Processando item:", item);

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

// NOVAS FUNÇÕES

// Função para gerar o zip da pasta local
async function generateZip(folderPath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const zipPath = path.join(os.tmpdir(), "backup.zip");
		const output = fs.createWriteStream(zipPath);
		const archive = archiver("zip", { zlib: { level: 9 } });
		
		output.on("close", () => resolve(zipPath));
		archive.on("error", err => reject(err));
		
		archive.pipe(output);
		archive.directory(folderPath, false);
		archive.finalize();
	});
}

// Função para calcular o hash do arquivo
function calculateFileHash(filePath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash("md5");
		const stream = fs.createReadStream(filePath);
		stream.on("data", data => hash.update(data));
		stream.on("end", () => resolve(hash.digest("hex")));
		stream.on("error", err => reject(err));
	});
}

const backupHashFile = path.resolve(__dirname, "backupHash.txt");

function readLastHash(): string | null {
	return fs.existsSync(backupHashFile) ? fs.readFileSync(backupHashFile, "utf8") : null;
}

function writeLastHash(hash: string): void {
	fs.writeFileSync(backupHashFile, hash, "utf8");
}

// MODIFICAÇÃO NA FUNÇÃO PRINCIPAL
const folderBackup = async () => {
	try {
		console.log("Gerando zip da pasta Documentos...", new Date);
		const zipPath = await generateZip(localFolderPath);
		const newHash = await calculateFileHash(zipPath);
		const lastHash = readLastHash();

		if (newHash === lastHash) {
			console.log("Nenhuma modificação detectada. Backup não será enviado.", new Date);
			return;
		}

		writeLastHash(newHash);
		console.log("Modificações detectadas. Enviando backup...", new Date);
		await uploadFileToDrive(zipPath, "Documentos_backup.zip", driveParentFolderId);
		console.log("Backup enviado com sucesso!", new Date, "\n --- \n");
	} catch (err) {
		console.error("Erro durante o backup:", err);
		return null;
	}
};

export default folderBackup;
