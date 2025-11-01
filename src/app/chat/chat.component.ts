import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatService, ChatMessage } from '../chat.service';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  messages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  private shouldScrollToBottom = false;

  constructor(
    private chatService: ChatService,
    private sanitizer: DomSanitizer
  ) {
    // Configure marked options for better rendering
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  ngOnInit(): void {}

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: this.userInput.trim(),
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    const prompt = this.userInput.trim();
    this.userInput = '';
    this.isLoading = true;
    this.shouldScrollToBottom = true;

    this.chatService.sendQuery(prompt).subscribe({
      next: (response) => {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          charts: response.charts,
          timestamp: new Date()
        };
        this.messages.push(assistantMessage);
        this.isLoading = false;
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        console.error('Error:', error);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        this.isLoading = false;
        this.shouldScrollToBottom = true;
      }
    });
  }

  parseMarkdown(content: string): SafeHtml {
    try {
      const html = marked.parse(content);
      return this.sanitizer.sanitize(1, html) || '';
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return content;
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = 
        this.messagesContainer.nativeElement.scrollHeight;
    } catch(err) {
      console.error('Scroll error:', err);
    }
  }

  clearChat(): void {
    this.messages = [];
  }
}

