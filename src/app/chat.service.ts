import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  charts?: string[];
  timestamp: Date;
}

export interface Action {
  type: 'send_sms' | 'send_email' | string;
  user_ids: string[];
  message?: string;
  subject?: string;
  reason: string;
}

export interface ChatMetadata {
  toolsUsed: string[];
  availableTools?: string[];
  cost: number;
  turns: number;
  sessionId: string;
  hasActions?: boolean;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  charts?: string[];
  actions?: Action[];
  metadata: ChatMetadata;
}

export interface ActionProcessResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:3000/query';
  // Direct call to backend - ensure backend has CORS enabled for http://localhost:4200
  // Using the exact URL that works in Postman
  private notificationsApiUrl = 'http://127.0.0.1/api/notifications/process_actions';
  
  // Bearer token for authentication
  private bearerToken = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vMTI3LjAuMC4xL2FwaS9hdXRoZW50aWNhdGUiLCJpYXQiOjE3NjE3NjAwNjUsImV4cCI6MTc3NzQ4NDg2NSwibmJmIjoxNzYxNzYwMDY1LCJqdGkiOiJGTDBLSmxvcDBjM1pneENqIiwic3ViIjoiNTI1MzYiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.0wwPPTDvm2QN6FwgMi6HJTk3zbITeED8G2N8gJ7oG2Y';

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  private getNotificationsHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': this.bearerToken
      })
    };
  }

  constructor(private http: HttpClient) {}

  sendQuery(prompt: string, sessionId?: string): Observable<ChatResponse> {
    const body: any = { prompt };
    if (sessionId) {
      body.sessionId = sessionId;
    }
    return this.http.post<ChatResponse>(this.apiUrl, body, this.httpOptions);
  }

  processAction(action: Action): Observable<ActionProcessResponse> {
    console.log('Processing action:', action);
    console.log('Sending to:', this.notificationsApiUrl);
    
    return this.http.post<ActionProcessResponse>(this.notificationsApiUrl, action, this.getNotificationsHttpOptions())
      .pipe(
        tap(response => {
          console.log('Action processed successfully:', response);
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Error processing action:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          console.error('Error details:', error.error);
          
          // Return a more detailed error
          return throwError(() => ({
            status: error.status,
            message: error.message,
            error: error.error || 'Unknown error occurred',
            details: `Failed to process ${action.type}. Status: ${error.status}`
          }));
        })
      );
  }
}

