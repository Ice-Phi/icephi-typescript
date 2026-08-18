import type { LanguageModelMiddleware } from 'ai';

export interface IcePhiShieldOptions {
  apiKey?: string;
  apiUrl?: string;
  raiseOnBlocked?: boolean;
  timeout?: number;
  debug?: boolean;
}

export const icePhiShield = (options: IcePhiShieldOptions = {}): LanguageModelMiddleware => {
  const apiKey = options.apiKey || process.env.ICEPHI_API_KEY;
  const apiUrl = options.apiUrl || 'https://api.icephi.com/shield';
  const raiseOnBlocked = options.raiseOnBlocked ?? true;
  const timeout = options.timeout ?? 2000;
  const debug = options.debug ?? false;

  return {
    transformParams: async ({ params }: { params: any }) => {
      const inputPrompt = extractPromptText(params);
      
      if (debug) {
        console.log(`[Ice Phi Middleware] Extracted Prompt for Inspection: "${inputPrompt}"`);
      }

      if (!inputPrompt) return params;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ prompt: inputPrompt }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (debug) console.warn(`[Ice Phi] Shield API error: ${response.statusText}`);
          return params; 
        }

        const result: any = await response.json();
        
        if (debug) {
          console.log(`[Ice Phi Shield Response]:`, JSON.stringify(result));
        }

        const isBlocked = result.is_clean === false || result.blocked === true;

        if (isBlocked) {
          if (raiseOnBlocked) {
            throw new Error(`[Ice Phi Security] Request blocked: Prompt injection or jailbreak detected.`);
          } else {
            if (debug) console.warn(`[Ice Phi] Attack detected. Neutralizing prompt.`);
            
            const safeFallback = "I'm sorry, but I cannot fulfill that request.";
            if (params.prompt) {
              params.prompt = safeFallback;
            } else if (params.messages && Array.isArray(params.messages)) {
              params.messages = [{ role: 'user', content: safeFallback }];
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          if (debug) console.warn(`[Ice Phi] Shield check timed out after ${timeout}ms. Proceeding safely.`);
        } else if (raiseOnBlocked && error.message.includes('[Ice Phi Security]')) {
          throw error;
        } else {
          if (debug) console.error(`[Ice Phi] Error executing shield check:`, error);
        }
      }

      return params;
    },
  };
};

function extractPromptText(params: any): string {
  if (params.prompt) {
    if (typeof params.prompt === 'string') return params.prompt;
    if (Array.isArray(params.prompt)) {
      return params.map((p: any) => p.content || '').join('\n');
    }
  }
  if (params.messages && Array.isArray(params.messages)) {
    return params.messages
      .map((m: any) => {
        if (typeof m.content === 'string') return m.content;
        if (Array.isArray(m.content)) {
          return m.content.map((c: any) => c.text || '').join('');
        }
        return '';
      })
      .join('\n');
  }
  return '';
}
