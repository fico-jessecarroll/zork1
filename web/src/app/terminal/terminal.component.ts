import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameState } from '../../engine/types';

export interface TranscriptLine {
  type: 'input' | 'response';
  text: string;
}

@Component({
  selector: 'app-terminal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './terminal.component.html',
  styleUrl: './terminal.component.css',
})
export class TerminalComponent implements AfterViewChecked {
  @Input() gameState: GameState | null = null;
  @Input() roomName = '';
  @Output() command = new EventEmitter<string>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  transcript: TranscriptLine[] = [];
  inputValue = '';

  private shouldScroll = false;

  addResponse(text: string): void {
    this.transcript.push({ type: 'response', text });
    this.shouldScroll = true;
  }

  submit(): void {
    const cmd = this.inputValue.trim();
    if (!cmd) return;
    this.transcript.push({ type: 'input', text: cmd });
    this.inputValue = '';
    this.shouldScroll = true;
    this.command.emit(cmd);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.submit();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {
      // container not yet rendered
    }
  }
}
