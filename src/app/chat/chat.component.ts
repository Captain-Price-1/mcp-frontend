import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatService, ChatMessage, Action } from '../chat.service';
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
  sessionId: string | null = null;
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

    // Send with sessionId if available
    this.chatService.sendQuery(prompt, this.sessionId || undefined).subscribe({
      next: (response) => {
        // Store sessionId from response
        if (response.metadata?.sessionId) {
          this.sessionId = response.metadata.sessionId;
        }

        // Create assistant message with the response
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          charts: response.charts,
          timestamp: new Date()
        };
        this.messages.push(assistantMessage);
        this.shouldScrollToBottom = true;

        // Process actions if they exist
        if (response.actions && response.actions.length > 0) {
          this.processActions(response.actions);
        } else {
          this.isLoading = false;
        }
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

  private processActions(actions: Action[]): void {
    let completedActions = 0;
    const totalActions = actions.length;

    if (totalActions === 0) {
      this.isLoading = false;
      return;
    }

    actions.forEach((action, index) => {
      console.log(`Processing action ${index + 1} of ${totalActions}:`, action);
      
      this.chatService.processAction(action).subscribe({
        next: (result) => {
          completedActions++;
          console.log(`Action ${index + 1} completed successfully:`, result);
          
          // Create a message showing the action result
          const actionType = action.type === 'send_sms' ? 'SMS' : action.type === 'send_email' ? 'Email' : action.type;
          const actionMessage: ChatMessage = {
            role: 'assistant',
            content: `**${actionType} Notification:**\n\n${result.message || 'Processed successfully'}\n\n**To:** ${action.user_ids.join(', ')}\n**Reason:** ${action.reason}`,
            timestamp: new Date()
          };
          this.messages.push(actionMessage);
          this.shouldScrollToBottom = true;

          // When all actions are processed, stop loading
          if (completedActions === totalActions) {
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error(`Action ${index + 1} processing error:`, error);
          completedActions++;
          
          // Extract more details from error
          const errorDetails = error?.details || error?.message || 'Unknown error';
          const errorStatus = error?.status ? ` (Status: ${error.status})` : '';
          
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: `**Error processing ${action.type}:**\n\n${errorDetails}${errorStatus}\n\n**Action details:**\n- Type: ${action.type}\n- To: ${action.user_ids.join(', ')}\n- Reason: ${action.reason}`,
            timestamp: new Date()
          };
          this.messages.push(errorMessage);
          this.shouldScrollToBottom = true;

          // When all actions are processed, stop loading
          if (completedActions === totalActions) {
            this.isLoading = false;
          }
        }
      });
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

  startNewChat(): void {
    this.messages = [];
    this.sessionId = null;
    this.userInput = '';
  }
}

