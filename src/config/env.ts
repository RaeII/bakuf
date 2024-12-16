import dotenv from "dotenv";
import * as path from "path";

// Especifique o caminho do arquivo .env explicitamente



const getEnvs = () => {
  const dotenvResult = dotenv.config({ path: path.resolve(__dirname, "../../.env") });

  if(dotenvResult.error) {
    const processEnv = process.env;

    if(processEnv && !processEnv.error) return processEnv;
  }

  return dotenvResult;
}
// const envFound = dotenv.config({ path: `.env` });
const envFound:any = getEnvs();

if (envFound.error) {
  // This error should crash whole process

  throw new Error(`Couldn't find .env file. ${envFound.error}`);
}

interface ENV {
  BAKUF_GOOGLE_API_KEY:string
  MYSQL_HOSTNAME:string
  MYSQL_PORT:string
  MYSQL_USERNAME:string
  MYSQL_PASSWORD:string
  MYSQL_NAME:string
}

const env: ENV = {
  BAKUF_GOOGLE_API_KEY: process.env.BAKUF_GOOGLE_API_KEY || '',
  MYSQL_HOSTNAME: process.env.MYSQL_HOSTNAME || '',
  MYSQL_PORT: process.env.MYSQL_PORT || '',
  MYSQL_USERNAME: process.env.MYSQL_USERNAME || '',
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || '',
  MYSQL_NAME: process.env.MYSQL_NAME || '',
};

export default env;
