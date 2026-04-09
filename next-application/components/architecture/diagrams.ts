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
    sbSessions[("chat_sessions JSON envelope + RLS")]
  end

  subgraph orchestration ["Orchestration Layer"]
    promptEngine["Prompt Engine"]
    trimStep["Trim History (token budget)"]
    memInject["Inject persisted memory into system"]
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
  sbSessions -. "summary + key facts" .-> memInject
  routeApi --> promptEngine & trimStep & memInject
  promptEngine & trimStep --> memInject
  memInject --> decisionGate
  
  decisionGate -- "Conversational" --> modelOnly
  decisionGate -- "Actionable" --> toolPath
  toolPath ==> mcpToolset
  
  modelOnly & mcpToolset --> responsePayload(["Response Payload"])

  style decisionGate fill:#f0fdf4,stroke:#22c55e,color:#166534
  style toolPath fill:#f0fdf4,stroke:#22c55e,color:#166534
  style memInject fill:#fef9c3,stroke:#ca8a04,color:#854d0e
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
    R->>S: Validate JWT session
    S-->>R: authenticated user
    opt conversationId present
        R->>S: SELECT chat_sessions.messages envelope
        S-->>R: prior memory + stored messages
    end
    Note over R: CAN-style requests may return before quota if required facts are missing
    R->>S: increment_and_check_chat_quota RPC
    S-->>R: allowed / remaining
    Note over R: Intent & Entity Detection
    R->>P: Assemble Thin System Prompt
    Note over R: Dedupe last user turn vs history
    R->>R: Trim History (LangChain)
    opt conversationId present
        R->>S: UPDATE envelope.memory before generation
    end
    Note over R: Append memory block to system string
    
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
    db[("Postgres + RLS<br/>chat_sessions envelope")]
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
    api["Route Handlers<br/>memory + trim + gateway"]
  end

  subgraph supa ["Supabase"]
    sauth["Email auth + JWT"]
    sdb["Postgres: sessions envelope, quotas"]
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

/**
 * How incident context survives long threads: structured memory in Postgres, bounded history, and CAN grounding.
 * Complements optimizedPipelineDiagram and endToEndRuntimeDiagram.
 */
export const conversationContextRetentionFlowDiagram = `
${baseTheme}
flowchart TB
  subgraph client ["Browser"]
    ui(["Chat UI"])
    hist["Recent message history + conversationId"]
  end

  subgraph api ["POST /api/chat"]
    load["Load JSON envelope from chat_sessions"]
    merge["Update incident summary + structured key facts"]
    can{{"CAN-style report?"}}
    needFacts["Require missing fields before LLM"]
    dedupe["Skip duplicate last user turn"]
    trim["LangChain trim to token budget"]
    sys["System prompt + memory block"]
    llm{{"AI Gateway"}}
  end

  subgraph store ["Supabase Postgres"]
    row[("chat_sessions row under RLS")]
  end

  ui --> hist
  hist --> load
  row -. "read JSON envelope" .-> load
  load --> merge
  merge --> can
  can -- "yes, incomplete facts" --> needFacts
  needFacts --> ui
  can -- "ok or not CAN" --> dedupe
  dedupe --> trim
  merge --> sys
  trim --> llm
  sys --> llm
  merge -. "persist memory fields" .-> row
  llm --> ui

  style needFacts fill:#fef9c3,stroke:#ca8a04,color:#854d0e
  style merge fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  style row fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  style sys fill:#f0fdf4,stroke:#22c55e,color:#166534
`;

/**
 * Sequence view: envelope read, memory update, optional CAN guard, persistence, then generation.
 */
export const conversationMemorySequenceDiagram = `
${baseTheme}
sequenceDiagram
    autonumber
    participant U as User
    participant C as Client
    participant R as Chat API
    participant D as Postgres chat_sessions
    participant G as AI Gateway

    U->>C: Send message
    C->>R: POST history + conversationId
    R->>D: SELECT messages JSON envelope
    D-->>R: prior messages + memory
    Note over R: Parse headings and key lines into keyFacts; refresh summary
    alt CAN report and required facts missing
        R-->>C: Guided reply listing missing fields
        C-->>U: No model call yet
    else facts sufficient or not CAN path
        R->>D: UPDATE envelope.memory
        Note over R: Dedupe last user message vs history; trim tokens
        R->>G: generateText(system + memory, trimmed messages)
        G-->>R: Assistant text
        R-->>C: Response + observability metadata
        C->>D: Debounced save full transcript RLS
        C-->>U: Render answer
    end
`;
