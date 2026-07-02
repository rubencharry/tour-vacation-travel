import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface PlanService {
  id: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class PlanServicesService {
  private http = inject(HttpClient);

  private catalog$ = this.http
    .get<PlanService[]>('/api/services')
    .pipe(shareReplay(1));

  getAll(): Observable<PlanService[]> {
    return this.catalog$;
  }
}
