import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  charts?: string[];
  timestamp: Date;
}

export interface ChatResponse {
  response: string;
  charts?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:3000/query';

  constructor(private http: HttpClient) {}

  sendQuery(prompt: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, { prompt });
  }
}

