import * as crypto from 'crypto';

export class FileUtils {
  static generateRandomFileName(originalName: string): string {
    const randomString = crypto.randomBytes(16).toString('hex');
    const fileExtension = originalName.split('.').pop();
    return `${randomString}.${fileExtension}`;
  }

  static generateRandomString(length: number = 10): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
}
