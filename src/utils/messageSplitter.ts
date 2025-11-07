// Utility to split AI responses into multiple human-like message parts
export function splitMessageIntoHumanParts(message: string): string[] {
  // Remove any leading/trailing whitespace
  const cleanMessage = message.trim();
  
  // Split by double line breaks first (paragraph breaks)
  const paragraphs = cleanMessage.split(/\n\s*\n/);
  
  if (paragraphs.length > 1) {
    // If there are paragraph breaks, each paragraph becomes a separate message
    return paragraphs.map(p => p.trim()).filter(p => p.length > 0);
  }
  
  // Split by single line breaks
  const lines = cleanMessage.split(/\n/);
  
  if (lines.length > 1) {
    // If there are line breaks, each line becomes a separate message
    return lines.map(line => line.trim()).filter(line => line.length > 0);
  }
  
  // If no line breaks, split by sentences for longer messages
  if (cleanMessage.length > 100) {
    const sentences = cleanMessage.split(/(?<=[.!?])\s+/);
    
    if (sentences.length > 2) {
      // Group sentences into 2-3 parts
      const parts: string[] = [];
      const totalSentences = sentences.length;
      
      if (totalSentences <= 4) {
        // Split into 2 parts
        const midPoint = Math.ceil(totalSentences / 2);
        parts.push(sentences.slice(0, midPoint).join(' ').trim());
        parts.push(sentences.slice(midPoint).join(' ').trim());
      } else {
        // Split into 3 parts
        const firstThird = Math.ceil(totalSentences / 3);
        const secondThird = Math.ceil((totalSentences * 2) / 3);
        
        parts.push(sentences.slice(0, firstThird).join(' ').trim());
        parts.push(sentences.slice(firstThird, secondThird).join(' ').trim());
        parts.push(sentences.slice(secondThird).join(' ').trim());
      }
      
      return parts.filter(part => part.length > 0);
    }
  }
  
  // Return as single message if no splitting needed
  return [cleanMessage];
}

// Function to add natural delays between message parts
export function getMessageDelay(partIndex: number, totalParts: number): number {
  // Base delay of 1-2 seconds, with slight randomization for naturalness
  const baseDelay = 1000 + Math.random() * 1000; // 1-2 seconds
  
  // Slightly longer delay for the last message
  if (partIndex === totalParts - 1) {
    return baseDelay + 500;
  }
  
  return baseDelay;
}