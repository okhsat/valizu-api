import type { OpenAPIV3 } from 'openapi-types';

export const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',

  info: {
    title: 'Valizu Backend API',
    version: '1.0.0',
    description:
      'Valizu backend case study API for Percon Bilişim Çözümleri ve Danışmanlık.',
  },

  servers: [
    {
      url: '/',
      description: 'Current server',
    },
  ],

  tags: [
    {
      name: 'Health',
      description: 'Service health endpoints',
    },
    {
      name: 'Trips',
      description: 'Trip operations',
    },
    {
      name: 'Bags',
      description: 'Trip bag operations',
    },
    {
      name: 'Items',
      description: 'Bag item operations',
    },
  ],

  components: {
    securitySchemes: {
      UserId: {
        type: 'apiKey',
        in: 'header',
        name: 'X-User-Id',
        description:
          'User identifier used by the case-study authentication middleware.',
      },
    },

    parameters: {
      TripId: {
        name: 'tripId',
        in: 'path',
        required: true,
        description: 'ID of the trip.',
        schema: {
          type: 'string',
          format: 'uuid',
        },
      },

      BagId: {
        name: 'bagId',
        in: 'path',
        required: true,
        description: 'ID of the bag.',
        schema: {
          type: 'string',
          format: 'uuid',
        },
      },

      ItemId: {
        name: 'itemId',
        in: 'path',
        required: true,
        description: 'ID of the item.',
        schema: {
          type: 'string',
          format: 'uuid',
        },
      },

      IdempotencyKey: {
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        description:
          'Unique key identifying this copy operation. Retrying the same key returns the original result without creating another trip.',
        schema: {
          type: 'string',
          minLength: 1,
          maxLength: 255,
        },
      },
    },

    schemas: {
      HealthResponse: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            example: 'ok',
          },
        },
      },

      CreateBagRequest: {
        type: 'object',
        required: ['name'],
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 150,
            example: 'Carry-on',
          },
        },
      },

      UpdateBagRequest: {
        type: 'object',
        required: ['name'],
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 150,
            example: 'Checked luggage',
          },
        },
      },

      AddItemRequest: {
        type: 'object',
        required: ['itemId'],
        additionalProperties: false,
        properties: {
          itemId: {
            type: 'string',
            format: 'uuid',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            default: 1,
            example: 2,
          },
        },
      },

      Item: {
        type: 'object',
        required: ['id', 'userId', 'name', 'category'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          userId: {
            type: 'string',
            format: 'uuid',
          },
          name: {
            type: 'string',
            example: 'Passport',
          },
          category: {
            type: 'string',
            nullable: true,
            example: 'Documents',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      BagResponse: {
        type: 'object',
        required: [
          'id',
          'tripId',
          'name',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          tripId: {
            type: 'string',
            format: 'uuid',
          },
          name: {
            type: 'string',
            example: 'Carry-on',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      BagResponseEnvelope: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            $ref: '#/components/schemas/BagResponse',
          },
        },
      },

      BagItemResponse: {
        type: 'object',
        required: [
          'id',
          'bagId',
          'itemId',
          'quantity',
          'createdAt',
          'updatedAt',
          'item',
        ],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          bagId: {
            type: 'string',
            format: 'uuid',
          },
          itemId: {
            type: 'string',
            format: 'uuid',
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            example: 2,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
          item: {
            $ref: '#/components/schemas/Item',
          },
        },
      },

      BagItemResponseEnvelope: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            $ref: '#/components/schemas/BagItemResponse',
          },
        },
      },

      CopyBagItem: {
        type: 'object',
        required: ['itemId', 'quantity'],
        properties: {
          itemId: {
            type: 'string',
            format: 'uuid',
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            example: 2,
          },
        },
      },

      CopiedBag: {
        type: 'object',
        required: ['id', 'name', 'items'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          name: {
            type: 'string',
            example: 'Carry-on',
          },
          items: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/CopyBagItem',
            },
          },
        },
      },

      CopyTripResult: {
        type: 'object',
        required: [
          'id',
          'name',
          'destination',
          'startDate',
          'endDate',
          'bags',
        ],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          name: {
            type: 'string',
            example: 'Copy of Istanbul Trip',
          },
          destination: {
            type: 'string',
            nullable: true,
            example: 'Istanbul',
          },
          startDate: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: '2026-09-01T00:00:00.000Z',
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: '2026-09-05T00:00:00.000Z',
          },
          bags: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/CopiedBag',
            },
          },
        },
      },

      CopyTripResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            $ref: '#/components/schemas/CopyTripResult',
          },
        },
      },

      ErrorResponse: {
        type: 'object',
        required: ['error', 'message'],
        properties: {
          error: {
            type: 'string',
            example: 'TRIP_NOT_FOUND',
          },
          message: {
            type: 'string',
            example: 'Trip not found',
          },
        },
      },

      ValidationErrorResponse: {
        type: 'object',
        required: ['error', 'message', 'details'],
        properties: {
          error: {
            type: 'string',
            example: 'VALIDATION_ERROR',
          },
          message: {
            type: 'string',
            example: 'Request validation failed',
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
        },
      },
    },
  },

  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the current API health status.',
        operationId: 'getHealth',

        responses: {
          '200': {
            description: 'API is healthy.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse',
                },
              },
            },
          },
        },
      },
    },

    '/trips/{tripId}/bags': {
      post: {
        tags: ['Bags'],
        summary: 'Create a bag',
        description:
          'Creates a new bag belonging to the specified trip.',
        operationId: 'createBag',

        security: [
          {
            UserId: [],
          },
        ],

        parameters: [
          {
            $ref: '#/components/parameters/TripId',
          },
        ],

        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateBagRequest',
              },
            },
          },
        },

        responses: {
          '201': {
            description: 'Bag created successfully.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BagResponseEnvelope',
                },
              },
            },
          },

          '400': {
            description: 'Request validation failed.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },

          '401': {
            description: 'Authentication required.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: 'UNAUTHENTICATED',
                  message: 'User authentication is required',
                },
              },
            },
          },

          '404': {
            description:
              'The requested trip does not exist for the authenticated user.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: 'TRIP_NOT_FOUND',
                  message: 'Trip not found',
                },
              },
            },
          },

          '500': {
            description: 'Unexpected server error.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },

    '/bags/{bagId}': {
      patch: {
        tags: ['Bags'],
        summary: 'Update a bag',
        description:
          'Updates the name of a bag belonging to the authenticated user.',
        operationId: 'updateBag',

        security: [
          {
            UserId: [],
          },
        ],

        parameters: [
          {
            $ref: '#/components/parameters/BagId',
          },
        ],

        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateBagRequest',
              },
            },
          },
        },

        responses: {
          '200': {
            description: 'Bag updated successfully.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BagResponseEnvelope',
                },
              },
            },
          },

          '400': {
            description: 'Request validation failed.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },

          '401': {
            description: 'Authentication required.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: 'UNAUTHENTICATED',
                  message: 'User authentication is required',
                },
              },
            },
          },

          '404': {
            description:
              'The requested bag does not exist for the authenticated user.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: 'BAG_NOT_FOUND',
                  message: 'Bag not found',
                },
              },
            },
          },

          '500': {
            description: 'Unexpected server error.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },

    '/bags/{bagId}/items': {
      post: {
        tags: ['Items'],
        summary: 'Add an item to a bag',
        description:
          'Adds an item owned by the authenticated user to a bag. If the item is already present, its quantity is incremented.',
        operationId: 'addItemToBag',

        security: [
          {
            UserId: [],
          },
        ],

        parameters: [
          {
            $ref: '#/components/parameters/BagId',
          },
        ],

        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AddItemRequest',
              },
            },
          },
        },

        responses: {
          '201': {
            description: 'Item added to the bag successfully.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BagItemResponseEnvelope',
                },
              },
            },
          },

          '400': {
            description: 'Request validation failed.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },

          '401': {
            description: 'Authentication required.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: 'UNAUTHENTICATED',
                  message: 'User authentication is required',
                },
              },
            },
          },

          '404': {
            description:
              'The bag or item does not exist for the authenticated user.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  bagNotFound: {
                    summary: 'Bag not found',
                    value: {
                      error: 'BAG_NOT_FOUND',
                      message: 'Bag not found',
                    },
                  },
                  itemNotFound: {
                    summary: 'Item not found',
                    value: {
                      error: 'ITEM_NOT_FOUND',
                      message: 'Item not found',
                    },
                  },
                },
              },
            },
          },

          '500': {
            description: 'Unexpected server error.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },

    '/bags/{bagId}/items/{itemId}': {
      delete: {
        tags: ['Items'],
        summary: 'Remove an item from a bag',
        description:
          'Removes the specified item from the bag.',
        operationId: 'removeItemFromBag',

        security: [
          {
            UserId: [],
          },
        ],

        parameters: [
          {
            $ref: '#/components/parameters/BagId',
          },
          {
            $ref: '#/components/parameters/ItemId',
          },
        ],

        responses: {
          '204': {
            description:
              'Item removed from the bag successfully.',
          },

          '401': {
            description: 'Authentication required.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: 'UNAUTHENTICATED',
                  message: 'User authentication is required',
                },
              },
            },
          },

          '404': {
            description:
              'The item is not present in the specified bag.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: 'BAG_ITEM_NOT_FOUND',
                  message: 'Item is not present in this bag',
                },
              },
            },
          },

          '500': {
            description: 'Unexpected server error.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },

    '/trips/{tripId}/copy': {
      post: {
        tags: ['Trips'],
        summary: 'Copy a trip',
        description:
          'Creates a copy of an existing trip, including its bags and bag items. The operation is idempotent when the same Idempotency-Key is reused.',

        operationId: 'copyTrip',

        security: [
          {
            UserId: [],
          },
        ],

        parameters: [
          {
            $ref: '#/components/parameters/TripId',
          },
          {
            $ref: '#/components/parameters/IdempotencyKey',
          },
        ],

        responses: {
          '201': {
            description:
              'Trip copied successfully. A retry with the same idempotency key returns the same result.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CopyTripResponse',
                },
              },
            },
          },

          '400': {
            description: 'Invalid idempotency key.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: 'INVALID_IDEMPOTENCY_KEY',
                  message:
                    'Idempotency-Key must be between 1 and 255 characters',
                },
              },
            },
          },

          '401': {
            description: 'Authentication required.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: 'UNAUTHENTICATED',
                  message: 'User authentication is required',
                },
              },
            },
          },

          '404': {
            description:
              'The requested trip does not exist for the authenticated user.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: 'TRIP_NOT_FOUND',
                  message: 'Trip not found',
                },
              },
            },
          },

          '409': {
            description:
              'The idempotency key was already used for a different logical request, or the same request is currently being processed.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  keyReused: {
                    summary: 'Idempotency key reused',
                    value: {
                      error: 'IDEMPOTENCY_KEY_REUSED',
                      message:
                        'The Idempotency-Key was already used for a different copy request',
                    },
                  },
                  inProgress: {
                    summary: 'Request in progress',
                    value: {
                      error: 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
                      message:
                        'The same copy request is currently being processed',
                    },
                  },
                },
              },
            },
          },

          '500': {
            description: 'Unexpected server error.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
  },
};
