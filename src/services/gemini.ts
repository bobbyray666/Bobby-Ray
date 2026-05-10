import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface AppFile {
  path: string;
  content: string;
}

export interface AppData {
  id?: string;
  name: string;
  version: string;
  description?: string;
  techStack?: string[];
  files: AppFile[];
  summary?: string;
}

export async function summarizeApp(app: AppData): Promise<string> {
  const fileSummary = app.files.map(f => `File: ${f.path}\n\n${f.content}`).join("\n\n---\n\n");
  
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Analyze the following application code and provide a structured "NotebookLM Source Document".
    
    Structure the response with:
    1. Title: ${app.name} (${app.version})
    2. Architecture Overview: A high-level description of how the app works.
    3. Key Components: List and explain the primary logic modules.
    4. Technical Stack: Dependencies and frameworks used.
    5. Version Notes & Comments: Structured version history and architectural comments.
    
    App Code:
    ${fileSummary}`
  });

  return response.text || "Failed to generate summary.";
}

export async function extractCodeFromChat(chatTranscript: string, sourceType: string = 'Gemini'): Promise<AppData> {
  let contextPrompt = '';
  
  switch(sourceType) {
    case 'Antigravity':
      contextPrompt = "This data comes from an Antigravity agentic session. Focus on extracting the autonomous logic, task distributions, and state machine definitions.";
      break;
    case 'Jules AI':
      contextPrompt = "This is a Google Jules AI export. Focus on cloud-native infrastructure-as-code, serverless functions, and GCP service mappings.";
      break;
    case 'Gemma':
      contextPrompt = "This is from a local Gemma LLM session. Focus on raw weights-to-logic mappings and fine-tuned output structures.";
      break;
    default:
      contextPrompt = "Extract the general application structure and file contents from this conversation.";
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Extract code from this ${sourceType} source data:
    ${chatTranscript}
    
    Source Context: ${sourceType}
    Instruction: ${contextPrompt}
    
    Return a JSON object with:
    {
      "name": "string",
      "description": "string",
      "version": "string",
      "files": [{ "path": "string", "content": "string" }]
    }`,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text) as AppData;
}

export async function refactorCode(path: string, content: string, instruction: string = 'Optimize and clean up this code'): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `You are an expert software engineer. Refactor the following file: ${path}
    
    Original Content:
    ${content}
    
    Instruction: ${instruction}
    
    Return ONLY the new file content. Do not include markdown blocks or commentary.`
  });

  return response.text?.trim() || content;
}

export async function summarizeFileContent(path: string, content: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Analyze this file: ${path}
    
    Content:
    ${content}
    
    Provide a concise (2-3 sentence) summary of what this file does, its main components, and its purpose in the architecture. Keep it technical and precise.`
  });

  return response.text?.trim() || "Unable to generate summary.";
}

export async function generateNotebookLMKnowledgeBase(app: AppData): Promise<string> {
  const fileSummary = app.files.map(f => `### FILE: ${f.path}\n\n\`\`\`${f.path.split('.').pop()}\n${f.content}\n\`\`\``).join("\n\n---\n\n");
  
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `You are creating a "Knowledge Base Document" for Google NotebookLM. 
    This document represents a versioned snaphot of an application built in AI Studio.
    
    App Name: ${app.name}
    Version: ${app.version}
    Description: ${app.description || 'N/A'}
    Tech Stack: ${app.techStack?.join(", ") || 'N/A'}

    Code Content:
    ${fileSummary}

    INSTRUCTIONS:
    Generate a single comprehensive Markdown document that is optimized for NotebookLM.
    - Start with a clear title and metadata.
    - Provide a "Contextual Executive Summary" for a researcher.
    - Include a "File Map" section.
    - For every file, provide 2-3 sentences of "Architectural Commentary" before the code.
    - Ensure all code is in properly labeled markdown blocks.
    - End with "Reflections & Future Directions" based on the current implementation.
    
    The goal is for NotebookLM to "understand" this app intimately so it can answer questions about the logic.`
  });

  return response.text || "Failed to generate Knowledge Base.";
}

export async function generateProjectHealthReport(app: AppData): Promise<string> {
  const fileStats = app.files.map(f => `${f.path} (${f.content.length} characters)`).join("\n");
  
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `As an elite software architect, perform a "Health & Sustainability Audit" for this project.
    
    App: ${app.name}
    Stack: ${app.techStack?.join(", ")}
    Files:
    ${fileStats}

    Audit Requirement:
    - Identify code smells or potential anti-patterns.
    - Rate the "NotebookLM Grounding Score" (how easy is it for an AI to understand this?).
    - Suggest structural improvements for scalability.
    - Detect potential security risks (exposed keys, insecure flows).
    
    Format the response in clean Markdown with professional headings.`
  });

  return response.text || "Failed to generate health report.";
}

export async function synthesizeEcosystemArchitecture(sourceType: string): Promise<AppData> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `As an elite AI systems architect, generate a high-fidelity architectural representation of the "${sourceType}" system.
    This is not a simulation; you must output the actual structural logic, core service definitions, and primary algorithmic components that define "${sourceType}".
    
    Source Specifics:
    - If Antigravity: Multi-agent orchestration, state-machine based task distribution, and recursive chain-of-thought logic.
    - If Jules AI: Cloud-native abstraction layers, serverless event-driven architecture, and GCP-integrated security modules.
    - If Gemma: Optimized local inference pathways, tokenizer configurations, and weight-to-logic mapping utilities.
    
    Blockchain Requirement:
    - Integrate a "DAO Governance" layer into each architecture that manages system upgrades and performance incentives using smart contract interfaces.
    
    Instruction: Use TurboQuant and NanoQuant compression principles in the documentation files to optimize for NotebookLM context limits.
    
    Return a JSON object with:
    {
      "name": "string",
      "description": "string",
      "version": "string",
      "techStack": ["string"],
      "files": [{ "path": "string", "content": "string" }]
    }`,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text) as AppData;
}

export async function compareVersions(oldVersion: AppData, newVersion: AppData): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Compare these two versions of the app "${oldVersion.name}" and generate an "Architectural Change Log".
    
    Base Version: ${oldVersion.version}
    Target Version: ${newVersion.version}

    Focus on logic shifts, new modules added, and behavioral changes. 
    Do not list every line change; summarize the evolution of the system.`
  });

  return response.text || "Failed to compare versions.";
}
