import dbBauckup from "./utils/dbBackup";
import folderBackup from "./utils/folderBackup";

(async () => {
  try {
    await dbBauckup()
    await folderBackup()
    process.exit()
  } catch (err) {
    console.error("Erro durante o upload:", err);
    process.exit()
  }
})();

