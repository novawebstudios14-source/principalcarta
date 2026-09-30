# Carta A Principal

Protótipo funcional da experiência **Uma carta para o seu bebê**, criado para A Principal Bebê e Mamãe.

## Executar

Requer Node.js 20 ou superior.

```bash
npm start
```

Abra `http://localhost:3000`.

## Geração por IA

A integração segue a mesma arquitetura segura utilizada no projeto Seu Moura: a chave fica apenas no servidor e o navegador chama uma rota interna.

```bash
GROQ_API_KEY="sua-chave" npm start
```

O modelo padrão é `llama-3.3-70b-versatile`. Para alterar:

```bash
GROQ_LETTER_MODEL="modelo-disponivel" GROQ_API_KEY="sua-chave" npm start
```

Sem chave ou quando o serviço estiver indisponível, o sistema gera uma carta automática de qualidade, deixando a demonstração totalmente funcional.

## Dados e produção

- Esta versão não grava nem encaminha os dados preenchidos.
- Para captação real, conecte o endpoint a um banco ou CRM controlado pela empresa.
- Situação gestacional e semana de gestação podem revelar dados de saúde. Antes da publicação definitiva, valide a política de privacidade, a base legal, a retenção e o acesso aos dados com responsável jurídico/LGPD.
- A chave de IA nunca deve ser colocada em `app.js`, no HTML ou no GitHub.

## Fluxo

1. Nome, WhatsApp e situação gestacional.
2. Campos condicionais: nome do bebê, semanas e outros filhos; ou nome e idade da criança.
3. Termos e autorização de comunicações.
4. Animação de envelope e carta personalizada.
5. Impressão ou salvamento em PDF pelo navegador.
