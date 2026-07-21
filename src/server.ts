import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from './utils/logger.js';
import {
  REMOTION_CORE_TOOLS,
  handleScaffoldProject,
  handlePreviewFrame,
  handleRenderVideo,
  ScaffoldProjectInput,
  PreviewFrameInput,
  RenderVideoInput,
} from './tools/remotion-core.js';
import {
  AUDIO_BEAT_TOOLS,
  handleAnalyzeAudio,
  AnalyzeAudioInput,
} from './tools/audio-beat.js';
import {
  GEMINI_TTS_TOOLS,
  handleGenerateTts,
  GenerateTtsInput,
} from './tools/gemini-tts.js';

export function createRemotionMcpServer() {
  const server = new Server(
    {
      name: 'remotion-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [...REMOTION_CORE_TOOLS, ...AUDIO_BEAT_TOOLS, ...GEMINI_TTS_TOOLS],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`Received CallTool request for "${name}"`);

    try {
      switch (name) {
        case 'remotion_scaffold_project': {
          const result = await handleScaffoldProject((args || {}) as unknown as ScaffoldProjectInput);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
            isError: !result.success,
          };
        }

        case 'remotion_preview_frame': {
          const result = await handlePreviewFrame((args || {}) as unknown as PreviewFrameInput);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
            isError: !result.success,
          };
        }

        case 'remotion_render_video': {
          const result = await handleRenderVideo((args || {}) as unknown as RenderVideoInput);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
            isError: !result.success,
          };
        }

        case 'remotion_analyze_audio': {
          const result = await handleAnalyzeAudio((args || {}) as unknown as AnalyzeAudioInput);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
            isError: !result.success,
          };
        }

        case 'remotion_generate_tts': {
          const result = await handleGenerateTts((args || {}) as unknown as GenerateTtsInput);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
            isError: !result.success,
          };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      logger.error(`Error handling tool "${name}":`, error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                code: 'ERR_UNKNOWN_TOOL',
                errorCode: 'ERR_UNKNOWN_TOOL',
                error: error instanceof Error ? error.message : String(error),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

export async function startServer() {
  const server = createRemotionMcpServer();
  const transport = new StdioServerTransport();

  logger.info('Starting Remotion MCP Server over StdioServerTransport...');
  await server.connect(transport);
  logger.info('Remotion MCP Server connected and ready.');
}
