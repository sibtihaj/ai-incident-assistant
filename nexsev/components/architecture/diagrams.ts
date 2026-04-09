/** 
 * Mermaid diagrams for the architecture and flow pages.
 * Styled for a modern, sleek look with custom theme variables.
 */

const baseTheme = `
  %%{init: {
    'theme': 'base',
    'themeVariables': {
      'primaryColor': '#f8fafc',
      'primaryTextColor': '#0f172a',
      'primaryBorderColor': '#0f172a',
      'lineColor': '#0f172a',
      'secondaryColor': '#f1f5f9',
      'tertiaryColor': '#ffffff',
      'mainBkg': '#ffffff',
      'nodeBorder': '#0f172a',
      'clusterBkg': '#f8fafc',
      'clusterBorder': '#0f172a',
      'fontSize': '14px',
      'fontFamily': 'var(--font-mono)',
      'textColor': '#0f172a',
      'nodeTextColor': '#0f172a',
      'edgeLabelBackground': '#ffffff'
    }
  }}%%
`;

export const antiPatternDiagram = `
${baseTheme}
flowchart TD
  userClient(["User Client"])
  routeApi[["Chat Route API"]]
  giantSystem[/"Large System Blob"/]
  duplicatedHistory[/"Duplicated History"/]
  staticContext[/"Oversized Context"/]
  modelGateway{{"Model Gateway"}}

  userClient --> routeApi
  staticContext -.-> giantSystem
  duplicatedHistory -.-> giantSystem
  giantSystem ===> modelGateway
  routeApi ==> modelGateway

  style giantSystem fill:#fee2e2,stroke:#ef4444,color:#b91c1c
  style duplicatedHistory fill:#fee2e2,stroke:#ef4444,color:#b91c1c
  style staticContext fill:#fee2e2,stroke:#ef4444,color:#b91c1c
`;

export const optimizedPipelineDiagram = `
${baseTheme}
flowchart TD
  userClient(["User Client"])
  routeApi[["Chat Route API"]]
  
  subgraph supabase ["Supabase Backend"]
    sbAuth["Auth / JWT"]
    sbQuota[("user_chat_usage")]
    sbSessions[("chat_sessions + RLS")]
  end

  subgraph orchestration ["Orchestration Layer"]
    promptEngine["Prompt Engine"]
    trimStep["Trim History"]
    decisionGate{{"Decision Gate"}}
  end

  subgraph execution ["Execution Paths"]
    modelOnly["Model Only"]
    toolPath["Tool Enabled"]
    mcpToolset[/"MCP Toolset"/]
  end

  userClient ==> routeApi
  routeApi --> sbAuth
  routeApi --> sbQuota
  userClient -. "list / save" .-> sbSessions
  routeApi --> promptEngine & trimStep
  promptEngine & trimStep --> decisionGate
  
  decisionGate -- "Conversational" --> modelOnly
  decisionGate -- "Actionable" --> toolPath
  toolPath ==> mcpToolset
  
  modelOnly & mcpToolset --> responsePayload(["Response Payload"])

  style decisionGate fill:#f0fdf4,stroke:#22c55e,color:#166534
  style toolPath fill:#f0fdf4,stroke:#22c55e,color:#166534
  style sbQuota fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  style sbSessions fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
`;

export const endToEndRuntimeDiagram = `
${baseTheme}
sequenceDiagram
    autonumber
    participant U as User
    participant C as Client
    participant S as Supabase Auth/DB
    participant R as API Route
    participant P as Prompt Engine
    participant M as AI Gateway
    participant T as MCP Server

    U->>C: Submit Prompt
    C->>R: POST /api/chat (session cookie)
    R->>S: Validate JWT + increment quota RPC
    S-->>R: allowed / remaining
    Note over R: Intent & Entity Detection
    R->>P: Assemble Thin System Prompt
    R->>R: Trim History (LangChain)
    
    alt isConversational
        R->>M: generateText (Model Only)
        M-->>R: Response
    else isActionable
        R->>T: List & Register Tools
        R->>M: generateText (with Tools)
        loop Tool Loop
            M->>T: Call Tool
            T-->>M: Tool Result
        end
        M-->>R: Final Response
    end
    
    R-->>C: JSON + Metadata
    C->>S: Debounced save chat_sessions (RLS)
    C-->>U: Render Response
`;

export const toolSelectionDiagram = `
${baseTheme}
flowchart LR
    input([Input]) --> loop{{"AI SDK Loop"}}
    
    subgraph mcp ["MCP Integration"]
        tools[/"MCP Tool Schemas"/]
        exec[["Execute Tool"]]
    end

    loop -- "Select Tool" --> tools
    tools --> exec
    exec -- "Result" --> loop
    
    loop -- "Finish" --> output([Output])

    style loop fill:#f0fdf4,stroke:#22c55e,color:#166534
    style exec fill:#f0fdf4,stroke:#22c55e,color:#166534
`;

export const operatorSaveFlowDiagram = `
${baseTheme}
flowchart LR
    ui(["Settings UI"]) ==> api[["PUT /api/settings"]]
    
    subgraph security ["Security Gate"]
        gate{{"Auth & Validation"}}
    end
    
    subgraph storage ["Persistence"]
        disk[("JSON Storage")]
    end

    api --> gate
    gate -- "Valid" --> disk
    disk -.-> next[["Next Request"]]

    style gate fill:#f0fdf4,stroke:#22c55e,color:#166534
`;

export const libHelpersModuleDiagram = `
${baseTheme}
flowchart TB
  subgraph browser ["Browser / Playground"]
    ui(["ChatInterface"])
    sbBrowser["Supabase browser client"]
  end

  subgraph server ["Server / API"]
    apiRoute[["route.ts"]]
    pe["Prompt Engine"]
    cd["Context Detector"]
  end

  subgraph supabase ["Supabase"]
    auth["Auth session"]
    db[("Postgres + RLS")]
  end

  subgraph config ["Config / Data"]
    pcs["Config Store"]
    files[/"JSON Configs"/]
  end

  ui ==> apiRoute
  ui <--> sbBrowser
  sbBrowser --> db
  apiRoute --> auth
  apiRoute --> db
  
  pe & cd --> apiRoute
  pcs --> pe
  files --> pcs

  style apiRoute fill:#f8fafc,stroke:#0f172a,color:#0f172a
  style ui fill:#f8fafc,stroke:#0f172a,color:#0f172a
  style db fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
`;

export const platformContextDiagram = `
${baseTheme}
flowchart LR
  subgraph next ["Next.js App"]
    pages["App Router + Middleware"]
    api["Route Handlers"]
  end

  subgraph supa ["Supabase"]
    sauth["Email auth + JWT"]
    sdb["Postgres: chat_sessions, user_chat_usage"]
    srls["RLS per user"]
  end

  subgraph ai ["AI + Tools"]
    gw["Vercel AI Gateway"]
    mcp["MCP server / tools"]
  end

  subgraph edge ["Abuse controls"]
    ts["Turnstile login"]
    quota["Rolling chat quota"]
  end

  pages --> sauth
  api --> sauth
  api --> sdb
  pages --> sdb
  sdb --> srls
  api --> gw
  api --> mcp
  ts -.-> pages
  quota -.-> api

  style sdb fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  style gw fill:#f0fdf4,stroke:#22c55e,color:#166534
`;

/**
 * Deployment topology: where each major component runs and how traffic flows between them.
 */
export const siteDeploymentDiagram = `
${baseTheme}
flowchart TB
  user(["Operator browser"])

  subgraph ext ["External managed services"]
    turnstile["Cloudflare Turnstile"]
    vgw["Vercel AI Gateway"]
  end

  subgraph vercel ["Next.js deployment on Vercel"]
    direction TB
    mw[["Edge middleware<br/>Supabase session refresh · device cookie · /chat auth gate"]]
    app["App Router<br/>pages + client bundles"]
    apiLogin[["POST /api/auth/login"]]
    apiChat[["POST/GET /api/chat"]]
    apiSettings[["/api/settings (optional editor)"]]
    app --> apiLogin
    app --> apiChat
    app --> apiSettings
    mw --> app
  end

  subgraph supa ["Supabase project"]
    sbAuth["Auth API (GoTrue)<br/>JWT + cookies"]
    pg[("PostgreSQL<br/>chat_sessions · user_chat_usage · quota RPC · RLS")]
  end

  mcp["MCP server process<br/>stdio (local) or remote transport (prod)"]

  user -->|HTTPS| mw
  user -.->|challenge widget| turnstile
  apiLogin -->|siteverify + signInWithPassword| sbAuth
  apiLogin -.->|server siteverify| turnstile
  apiChat -->|getUser| sbAuth
  apiChat -->|RPC quota as authenticated user| pg
  app -->|Supabase JS · RLS · chat_sessions| pg
  apiChat -->|AI SDK HTTP| vgw
  apiChat -->|generateText + tools| mcp

  style pg fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  style sbAuth fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  style vgw fill:#f0fdf4,stroke:#22c55e,color:#166534
  style mcp fill:#fef3c7,stroke:#d97706,color:#92400e
  style mw fill:#f8fafc,stroke:#0f172a,color:#0f172a
`;
