// src/clients/emailClient.ts
import createClient from "openapi-fetch";
import type { paths } from "@mairie360/email-api-openapi"; 

const emailClient = createClient<paths>({ 
    baseUrl: process.env.EMAIL_API_URL 
});

export default emailClient;