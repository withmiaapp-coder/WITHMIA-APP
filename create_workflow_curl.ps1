# PowerShell script to create Chatwoot workflow in n8n

$n8nApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Mjk3OTc3fQ.aCNw5pXWbnyy_JDk24TsYN69T61acaEqoELhrtNtlI0'
$n8nUrl = 'https://n8n-production-00dd.up.railway.app'

# Simple workflow JSON - minimal structure that n8n accepts
$workflow = @{
    name = "Chatwoot Bot - withmia-nfudrg"
    nodes = @(
        @{
            parameters = @{
                httpMethod = "POST"
                path = "chatwoot-withmia-nfudrg"
                options = @{}
            }
            type = "n8n-nodes-base.webhook"
            typeVersion = 2
            position = @(-480, 300)
            name = "Chatwoot Webhook"
        },
        @{
            parameters = @{
                conditions = @{
                    options = @{
                        caseSensitive = $true
                        leftValue = ""
                        typeValidation = "loose"
                        version = 2
                    }
                    conditions = @(
                        @{
                            leftValue = "={{ `$json.body.event }}"
                            rightValue = "message_created"
                            operator = @{
                                type = "string"
                                operation = "equals"
                            }
                        },
                        @{
                            leftValue = "={{ `$json.body.message_type }}"
                            rightValue = "incoming"
                            operator = @{
                                type = "string"
                                operation = "equals"
                            }
                        }
                    )
                    combinator = "and"
                }
            }
            type = "n8n-nodes-base.if"
            typeVersion = 2
            position = @(-240, 300)
            name = "Is Incoming Message?"
        },
        @{
            parameters = @{
                jsCode = @"
// Normalizar datos de Chatwoot
const body = `$input.first().json.body;

return [{
  json: {
    // Datos del mensaje
    content: body.content || '',
    messageId: body.id,
    conversationId: body.conversation?.id,
    
    // Datos del sender
    senderName: body.sender?.name || 'Cliente',
    senderPhone: body.sender?.phone_number || body.conversation?.meta?.sender?.phone_number || '',
    senderId: body.sender?.id,
    
    // Datos del inbox
    inboxId: body.inbox?.id,
    inboxName: body.inbox?.name || '',
    
    // Datos de cuenta
    accountId: body.account?.id,
    
    // Timestamp
    timestamp: body.created_at || new Date().toISOString(),
    
    // Raw data for debugging
    _raw: body
  }
}];
"@
            }
            type = "n8n-nodes-base.code"
            typeVersion = 2
            position = @(0, 300)
            name = "Normalize Chatwoot Data"
        },
        @{
            parameters = @{
                conditions = @{
                    options = @{
                        caseSensitive = $true
                        leftValue = ""
                        typeValidation = "loose"
                        version = 2
                    }
                    conditions = @(
                        @{
                            leftValue = "={{ `$json.content }}"
                            rightValue = ""
                            operator = @{
                                type = "string"
                                operation = "notEquals"
                            }
                        },
                        @{
                            leftValue = "={{ `$json.senderPhone }}"
                            rightValue = ""
                            operator = @{
                                type = "string"
                                operation = "notEquals"
                            }
                        }
                    )
                    combinator = "and"
                }
            }
            type = "n8n-nodes-base.if"
            typeVersion = 2
            position = @(240, 300)
            name = "Has Content?"
        },
        @{
            parameters = @{
                method = "GET"
                url = "https://app.withmia.com/api/n8n/company-config-by-inbox/={{ encodeURIComponent(`$json.inboxName) }}"
                options = @{}
            }
            type = "n8n-nodes-base.httpRequest"
            typeVersion = 4.2
            position = @(480, 300)
            name = "Get Company Config"
        },
        @{
            parameters = @{
                promptType = "define"
                text = "={{ `$('Normalize Chatwoot Data').item.json.content }}"
                options = @{
                    systemMessage = "={{ `$json.ai_prompt || 'Eres MIA, un asistente virtual amigable. Responde de forma clara y concisa.' }}"
                }
            }
            type = "@n8n/n8n-nodes-langchain.agent"
            typeVersion = 1.7
            position = @(720, 300)
            name = "AI Agent"
        },
        @{
            parameters = @{
                model = "gpt-4o-mini"
                options = @{
                    temperature = 0.7
                }
            }
            type = "@n8n/n8n-nodes-langchain.lmChatOpenAi"
            typeVersion = 1.2
            position = @(720, 500)
            name = "OpenAI Chat Model"
            credentials = @{
                openAiApi = @{
                    id = "G5yV74Y2bH5UPxXm"
                    name = "OpenAI Account"
                }
            }
        },
        @{
            parameters = @{
                qdrantCollection = @{
                    __rl = $true
                    value = "={{ `$('Get Company Config').item.json.qdrant_collection }}"
                    mode = "id"
                }
                options = @{}
            }
            type = "@n8n/n8n-nodes-langchain.vectorStoreQdrant"
            typeVersion = 1
            position = @(920, 500)
            name = "Qdrant Vector Store"
            credentials = @{
                qdrantApi = @{
                    id = "irLYcaNHzHrWcZ3Z"
                    name = "Qdrant"
                }
            }
        },
        @{
            parameters = @{
                model = "text-embedding-3-small"
                options = @{}
            }
            type = "@n8n/n8n-nodes-langchain.embeddingsOpenAi"
            typeVersion = 1.1
            position = @(1080, 620)
            name = "OpenAI Embeddings"
            credentials = @{
                openAiApi = @{
                    id = "G5yV74Y2bH5UPxXm"
                    name = "OpenAI Account"
                }
            }
        },
        @{
            parameters = @{
                topK = 5
            }
            type = "@n8n/n8n-nodes-langchain.retrieverVectorStore"
            typeVersion = 1
            position = @(920, 620)
            name = "Vector Store Retriever"
        },
        @{
            parameters = @{
                jsCode = @"
// Procesar respuesta del AI
const aiOutput = `$input.first().json.output || `$input.first().json.text || '';
const companyConfig = `$('Get Company Config').item.json;
const messageData = `$('Normalize Chatwoot Data').item.json;

return [{
  json: {
    response: aiOutput,
    phone: messageData.senderPhone.replace(/[^0-9]/g, ''),
    instanceName: companyConfig.evolution_instance || 'withmia-nfudrg',
    conversationId: messageData.conversationId,
    companySlug: companyConfig.company_slug || 'withmia-nfudrg',
    evolutionApiUrl: companyConfig.evolution_api_url || 'https://evolution-api-production-a7b5.up.railway.app',
    evolutionApiKey: companyConfig.evolution_api_key || ''
  }
}];
"@
            }
            type = "n8n-nodes-base.code"
            typeVersion = 2
            position = @(960, 300)
            name = "Process Response"
        },
        @{
            parameters = @{
                method = "POST"
                url = "={{ `$json.evolutionApiUrl }}/message/sendText/{{ `$json.instanceName }}"
                sendHeaders = $true
                headerParameters = @{
                    parameters = @(
                        @{
                            name = "apikey"
                            value = "={{ `$json.evolutionApiKey }}"
                        }
                    )
                }
                sendBody = $true
                bodyParameters = @{
                    parameters = @(
                        @{
                            name = "number"
                            value = "={{ `$json.phone }}"
                        },
                        @{
                            name = "text"
                            value = "={{ `$json.response }}"
                        }
                    )
                }
                options = @{}
            }
            type = "n8n-nodes-base.httpRequest"
            typeVersion = 4.2
            position = @(1200, 300)
            name = "Send WhatsApp Response"
        },
        @{
            parameters = @{
                method = "POST"
                url = "https://app.withmia.com/api/n8n/notify-response"
                sendBody = $true
                specifyBody = "json"
                jsonBody = @"
={
  "company_slug": `$json.companySlug,
  "conversation_id": `$json.conversationId,
  "message": `$json.response,
  "phone": `$json.phone,
  "direction": "outgoing"
}
"@
                options = @{}
            }
            type = "n8n-nodes-base.httpRequest"
            typeVersion = 4.2
            position = @(1440, 300)
            name = "Notify Laravel"
        }
    )
    connections = @{
        "Chatwoot Webhook" = @{
            main = @(
                @(
                    @{
                        node = "Is Incoming Message?"
                        type = "main"
                        index = 0
                    }
                )
            )
        }
        "Is Incoming Message?" = @{
            main = @(
                @(
                    @{
                        node = "Normalize Chatwoot Data"
                        type = "main"
                        index = 0
                    }
                )
            )
        }
        "Normalize Chatwoot Data" = @{
            main = @(
                @(
                    @{
                        node = "Has Content?"
                        type = "main"
                        index = 0
                    }
                )
            )
        }
        "Has Content?" = @{
            main = @(
                @(
                    @{
                        node = "Get Company Config"
                        type = "main"
                        index = 0
                    }
                )
            )
        }
        "Get Company Config" = @{
            main = @(
                @(
                    @{
                        node = "AI Agent"
                        type = "main"
                        index = 0
                    }
                )
            )
        }
        "AI Agent" = @{
            main = @(
                @(
                    @{
                        node = "Process Response"
                        type = "main"
                        index = 0
                    }
                )
            )
        }
        "Process Response" = @{
            main = @(
                @(
                    @{
                        node = "Send WhatsApp Response"
                        type = "main"
                        index = 0
                    }
                )
            )
        }
        "Send WhatsApp Response" = @{
            main = @(
                @(
                    @{
                        node = "Notify Laravel"
                        type = "main"
                        index = 0
                    }
                )
            )
        }
        "OpenAI Chat Model" = @{
            ai_languageModel = @(
                @(
                    @{
                        node = "AI Agent"
                        type = "ai_languageModel"
                        index = 0
                    }
                )
            )
        }
        "Vector Store Retriever" = @{
            ai_retriever = @(
                @(
                    @{
                        node = "AI Agent"
                        type = "ai_retriever"
                        index = 0
                    }
                )
            )
        }
        "Qdrant Vector Store" = @{
            ai_vectorStore = @(
                @(
                    @{
                        node = "Vector Store Retriever"
                        type = "ai_vectorStore"
                        index = 0
                    }
                )
            )
        }
        "OpenAI Embeddings" = @{
            ai_embedding = @(
                @(
                    @{
                        node = "Qdrant Vector Store"
                        type = "ai_embedding"
                        index = 0
                    }
                )
            )
        }
    }
    settings = @{
        executionOrder = "v1"
    }
}

$json = $workflow | ConvertTo-Json -Depth 20 -Compress

# Create workflow
Write-Host "Creating workflow..."
$headers = @{
    "Content-Type" = "application/json"
    "X-N8N-API-KEY" = $n8nApiKey
}

try {
    $response = Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows" -Method Post -Headers $headers -Body $json
    Write-Host "Workflow created with ID: $($response.id)"
    
    # Activate workflow
    Write-Host "Activating workflow..."
    $activateResponse = Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows/$($response.id)/activate" -Method Post -Headers $headers
    Write-Host "Workflow activated: $($activateResponse.active)"
}
catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}
