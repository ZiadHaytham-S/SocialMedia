declare global {
  namespace Express {
    namespace Multer {
      interface File {
        finalPath?: string;
      }
    }
  }
}
