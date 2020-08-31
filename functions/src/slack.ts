import axios from 'axios';
const { slack_config } = require('./credentials');

export const postToSlack = async (text: string): Promise<void> =>
  await axios
    .post(slack_config.url, { text })
    .then((res) => {
      console.log(`[slack] data: ${res.data}`);
      console.log(`[slack] status: ${res.status}`);
      console.log(`[slack] statusText: ${res.statusText}`);
      console.log(`[slack] headers: ${res.headers}`);
      console.log(`[slack] config: ${res.config}`);
    })
    .catch((error) => {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(`[slack] error: response.data: ${error.response.data}`);
        console.log(`[slack] error: response.status: ${error.response.status}`);
        console.log(
          `[slack] error: response.headers: ${error.response.headers}`
        );
      }
      // Something happened in setting up the request that triggered an Error
      else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(`[slack] error: request: ${error.request}`);
      } else console.log(`[slack] error: message: ${error.message}`);

      console.log(`[slack] error: config: ${error.config}`);
    });
