import { google } from "googleapis";
import * as path from "path";

// Autenticação com Google Drive
const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(__dirname, "../auth/bakuf-444514-9c394ba037e6.json"), // Caminho da chave JSON
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });

export default drive