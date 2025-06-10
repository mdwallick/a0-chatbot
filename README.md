# a0-chatbot

## Introduction

This is a demo chatbot using Auth0's [Auth for GenAI](https://auth0.com/ai).
This readme will be updated with all the relevant details once the first version is deployed.

## ⚠️ Disclaimer

This project is **not production-ready** and is provided for **demonstration, educational and experimental purposes only**.  
It comes with **no warranty of any kind**, either express or implied. Use it **at your own risk**.

The authors and contributors are **not liable for any damages or losses** arising from the use of this code.  
You are solely responsible for evaluating its fitness for your intended use, and for ensuring it meets all relevant legal, security, and quality standards before deploying it in any production environment.

## Getting Started

Clone the repository and navigate to the project directory:

```bash
git clone https://github.com/mdwallick/a0-chatbot && cd a0-chatbot
```

Copy `env.sample` to `.env.local` and fill in all the relevant environment
variables.

NOTE:

- You will need to set up an [OpenAI Platform account](https://platform.openai.com/docs/overview) and create an API key.
- For web search to work, you need to set up a [Google Custom search API](https://developers.google.com/custom-search/v1/overview).

```bash
cp env.sample .env.local
```

Install Postgres locally

```bash
brew install postgresql
```

Create a new empty database

```bash
createdb chatbot
```

Install Dependencies. This will also set up the necessary tables and schemas.

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Contributing

Feel free to open issues and pull requests if you have suggestions for improvements or fixes.
See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
