import { Router } from 'express';
import axios from 'axios'; // La lib utilisée

const router = Router();

// Récupération des variables d'environnement
const core_api_url = process.env.CORE_API_URL;
const core_api_port = process.env.CORE_API_PORT;

const email_api_url = process.env.EMAIL_API_URL;
const email_api_port = process.env.EMAIL_API_PORT;

const CORE_FULL_URL = `http://${core_api_url}:${core_api_port}`;
const EMAIL_FULL_URL = `http://${email_api_url}:${email_api_port}`;

router.get('/', async (_, res) => {
  try {
    const coreResponse = await axios.get(`${CORE_FULL_URL}/health`, { timeout: 5000 });
    console.log(coreResponse);
    const core_is_reachable = coreResponse.status === 200;
    
    const emailResponse = await axios.get(`${EMAIL_FULL_URL}/health`, { timeout: 5000 });
    console.log(emailResponse);
    const email_is_reachable = emailResponse.status === 200;
    
    res.status(200).json({
      status: 'OK',
      core_api: core_is_reachable ? 'Connected' : 'Unreachable',
      email_api: email_is_reachable ? 'Connected' : 'Unreachable',
      details: {
        core: coreResponse.data,
        email: emailResponse.data
      }
    });
  } catch (error) {
    res.status(502).json({
      status: 'Error',
      core_api: 'Unreachable',
      email_api: 'Unreachable',
      message: (error as Error).message
    });
  }
});

export default router;