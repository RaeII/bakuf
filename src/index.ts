import dbBauckup from "./utils/dbBackup";
import folderBackup from "./utils/folderBackup";

(async () => {
  try {
    await dbBauckup()
    await folderBackup()
  } catch (err) {
    console.error("Erro durante o upload:", err);
  }
})();

