# @ice_phi/icephi-ts

TypeScript defense client and shield engine against prompt injections and jailbreaks.

For more documentation go to https://IcePhi.com

## Installation

```bash
npm install @ice_phi/icephi-ts

Quick Start
TypeScript

import { ShieldClient } from '@ice_phi/icephi-ts';

// Initialize your shield instance
const shield = new ShieldClient({
  // configuration options
});

// Example usage against an LLM prompt
const response = shield.inspect("Your user input here");
if (response.isBlocked) {
  console.warn("Potential prompt injection detected!");
}
```
License

MIT
