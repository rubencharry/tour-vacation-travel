import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly http = inject(HttpClient);

  async uploadFile(file: File): Promise<string> {
    const base64 = await this.toBase64(file);
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';

    const { publicUrl } = await firstValueFrom(
      this.http.post<{ publicUrl: string }>('/api/admin/media/upload', {
        file: base64,
        extension,
      }),
    );

    return publicUrl;
  }

  private toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Quita el prefijo "data:image/...;base64," y devuelve solo el base64 puro
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
