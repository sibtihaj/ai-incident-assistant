export const antiPatternDiagram = `
flowchart TD
  userClient["UserClient"]
  routeApi["ChatRouteAPI"]
  giantSystem["LargeSystemBlob"]
  duplicatedHistory["DuplicatedHistoryInSystemAndMessages"]
  staticContext["OversizedContextJson"]
  modelGateway["ModelGatewayCall"]

  userClient --> routeApi
  staticContext --> giantSystem
  duplicatedHistory --> giantSystem
  giantSystem --> modelGateway
  routeApi --> modelGateway
`;

export const optimizedPipelineDiagram = `
flowchart TD
  userClient["UserClient"]
  routeApi["ChatRouteAPI"]
  promptEngine["PromptEngineThinSystem"]
  trimStep["TrimMessagesHistoryWindow"]
  decisionGate["ConversationDecisionGate"]
  modelOnly["ModelOnlyPath"]
  toolPath["ToolEnabledPath"]
  mcpToolset["McpToolsetFromListTools"]
  responsePayload["ResponsePayloadToClient"]

  userClient --> routeApi
  routeApi --> promptEngine
  routeApi --> trimStep
  routeApi --> decisionGate
  decisionGate -->|"Conversational"| modelOnly
  decisionGate -->|"Actionable"| toolPath
  toolPath --> mcpToolset
  modelOnly --> responsePayload
  toolPath --> responsePayload
`;

export const endToEndRuntimeDiagram = `
flowchart LR
  userSubmit["UserSubmitsPrompt"]
  chatUi["ChatUI"]
  postApi["POSTApiChat"]
  parseReq["ParseBodyAndValidate"]
  detectContext["DetectIntentAndEntities"]
  buildPrompt["BuildThinSystemPrompt"]
  trimHistory["TrimMessagesHistory"]
  decisionNode["ConversationalOrActionableDecision"]
  modelCall["GenerateTextModelCall"]
  connectMcp["EnsureMcpConnection"]
  buildTools["BuildAiSdkToolsFromMcp"]
  modelWithTools["GenerateTextWithTools"]
  toolExecute["McpToolExecution"]
  finalize["FinalizeAssistantTextAndMetadata"]
  returnUi["ReturnJsonToClient"]
  renderUi["RenderAssistantResponse"]

  userSubmit --> chatUi --> postApi --> parseReq --> detectContext --> buildPrompt --> trimHistory --> decisionNode
  decisionNode -->|"Conversational"| modelCall --> finalize
  decisionNode -->|"Actionable"| connectMcp --> buildTools --> modelWithTools --> toolExecute --> modelWithTools
  modelWithTools --> finalize --> returnUi --> renderUi
`;

export const toolSelectionDiagram = `
flowchart TD
  requestInput["IncomingRequest"]
  modelLoop["ToolCapableModelLoop"]
  listTools["RegisteredToolsFromMcp"]
  chooseTool["ModelChoosesToolOrNoTool"]
  noTool["NoToolCall"]
  toolCall["ToolCallRequested"]
  executeTool["McpClientCallTool"]
  toolResult["ToolResultReturned"]
  continueLoop["ContinueGeneration"]
  finalAnswer["FinalAssistantAnswer"]

  requestInput --> modelLoop
  listTools --> modelLoop
  modelLoop --> chooseTool
  chooseTool -->|"NoToolNeeded"| noTool --> finalAnswer
  chooseTool -->|"ToolNeeded"| toolCall --> executeTool --> toolResult --> continueLoop --> modelLoop
`;

export const operatorSaveFlowDiagram = `
flowchart TD
  operatorUi["OperatorSettingsUI"]
  validateClient["ClientValidation"]
  putApi["PUTApiSettings"]
  authGate["EditorAccessGate"]
  validateServer["ServerSchemaValidation"]
  persistConfig["PersistConfigStorage"]
  nextChat["NextChatRequestReadsConfig"]

  operatorUi --> validateClient --> putApi --> authGate --> validateServer --> persistConfig --> nextChat
`;

/** How nexsev/lib helper modules relate to the chat API route and each other. */
export const libHelpersModuleDiagram = `
flowchart TB
  subgraph client["Browser_playground"]
    ui["ChatInterface"]
    cm["conversationManager.ts"]
    cs["conversationStorage.ts"]
    tg["titleGenerator.ts"]
  end

  subgraph server["Node_POST_api_chat"]
    apiRoute["route.ts"]
    pe["promptEngine.ts"]
    cd["contextDetector.ts"]
  end

  subgraph cfg["Config_on_disk"]
    ctxJson["context.json"]
    prJson["prompt-runtime.json"]
    pcs["promptConfigStore.ts"]
  end

  ctxJson --> pcs
  prJson --> pcs
  pcs --> pe
  cd --> apiRoute
  pe --> apiRoute
  ui -->|"POST_body_history_and_message"| apiRoute
  ui --> cm
  tg --> cm
  cs -.->|"stub_no_persistence"| cm
`;
