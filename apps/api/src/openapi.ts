import type { INestApplication } from "@nestjs/common";

const bearerSecurity = [{ bearerAuth: [] }];

export function createOpenApiDocument(_app?: INestApplication) {
  return {
    openapi: "3.0.3",
    info: {
      title: "PAOSITRA - API de gestion",
      description:
        "API versionnée des lots Trésorerie et Gestion des opérations. Les choix techniques documentés ne constituent pas des exigences contractuelles du DAO.",
      version: "0.1.0"
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        ProblemDetails: {
          type: "object",
          properties: {
            type: { type: "string" },
            title: { type: "string" },
            status: { type: "integer" },
            detail: { type: "string" },
            instance: { type: "string" },
            timestamp: { type: "string", format: "date-time" }
          }
        }
      }
    },
    paths: {
      "/api/v1/auth/login": {
        post: {
          tags: ["Authentification"],
          summary: "Connexion locale provisoire",
          responses: {
            "201": { description: "Session ouverte" },
            "400": { description: "Requête invalide" },
            "401": { description: "Identifiants refusés" }
          }
        }
      },
      "/api/v1/auth/change-password": {
        post: {
          tags: ["Authentification"],
          summary: "Changement de mot de passe",
          security: bearerSecurity,
          responses: {
            "201": { description: "Mot de passe modifié" },
            "401": { description: "Authentification requise" }
          }
        }
      },
      "/api/v1/auth/logout": {
        post: {
          tags: ["Authentification"],
          summary: "Déconnexion",
          security: bearerSecurity,
          responses: {
            "201": { description: "Session fermée" },
            "401": { description: "Authentification requise" }
          }
        }
      },
      "/api/v1/auth/me": {
        get: {
          tags: ["Authentification"],
          summary: "Utilisateur connecté",
          security: bearerSecurity,
          responses: {
            "200": { description: "Utilisateur courant" },
            "401": { description: "Authentification requise" }
          }
        }
      },
      "/api/v1/platform/users": {
        post: {
          tags: ["Plateforme"],
          summary: "Création contrôlée d'un utilisateur sans habilitation automatique",
          security: bearerSecurity,
          responses: {
            "201": { description: "Utilisateur créé" },
            "403": { description: "Permission refusée" }
          }
        }
      },
      "/api/v1/platform/audit-events": {
        get: {
          tags: ["Plateforme"],
          summary: "Consultation protégée des événements d'audit",
          security: bearerSecurity,
          responses: {
            "200": { description: "Liste paginée" },
            "403": { description: "Permission refusée" }
          }
        }
      },
      "/api/v1/treasury/institutions": {
        get: {
          tags: ["Trésorerie"],
          summary: "Liste des institutions financières",
          security: bearerSecurity,
          responses: { "200": { description: "Liste paginée" } }
        },
        post: {
          tags: ["Trésorerie"],
          summary: "Création contrôlée d'une institution",
          security: bearerSecurity,
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: { "201": { description: "Institution créée" } }
        }
      },
      "/api/v1/treasury/institutions/{id}": {
        patch: {
          tags: ["Trésorerie"],
          summary: "Modification contrôlée d'une institution",
          security: bearerSecurity,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Institution modifiée" } }
        }
      },
      "/api/v1/treasury/placements": {
        get: {
          tags: ["Trésorerie"],
          summary: "Liste des placements",
          security: bearerSecurity,
          responses: { "200": { description: "Liste paginée" } }
        },
        post: {
          tags: ["Trésorerie"],
          summary: "Ouverture contrôlée d'un placement",
          security: bearerSecurity,
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: { "201": { description: "Placement créé" } }
        }
      },
      "/api/v1/treasury/placements/{id}": {
        patch: {
          tags: ["Trésorerie"],
          summary: "Modification contrôlée d'un placement",
          security: bearerSecurity,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Placement modifié" } }
        }
      },
      "/api/v1/treasury/placements/{id}/cancel": {
        post: {
          tags: ["Trésorerie"],
          summary: "Annulation logique d'un placement",
          security: bearerSecurity,
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
            { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } }
          ],
          responses: { "201": { description: "Annulation enregistrée" } }
        }
      },
      "/api/v1/treasury/placements/{id}/close": {
        post: {
          tags: ["Trésorerie"],
          summary: "Clôture contrôlée d'un placement",
          security: bearerSecurity,
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
            { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } }
          ],
          responses: { "201": { description: "Clôture enregistrée" } }
        }
      },
      "/api/v1/operations/agencies": {
        get: {
          tags: ["Opérations"],
          summary: "Liste des agences",
          security: bearerSecurity,
          responses: { "200": { description: "Liste paginée" } }
        },
        post: {
          tags: ["Opérations"],
          summary: "Ouverture contrôlée d'une agence",
          security: bearerSecurity,
          parameters: [
            { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } }
          ],
          responses: { "201": { description: "Agence créée" } }
        }
      },
      "/api/v1/operations/agencies/{id}/close": {
        post: {
          tags: ["Opérations"],
          summary: "Fermeture logique d'une agence",
          security: bearerSecurity,
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
            { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } }
          ],
          responses: { "201": { description: "Fermeture enregistrée" } }
        }
      }
    }
  };
}

export function configureOpenApiUi(_app: INestApplication) {
  return undefined;
}
