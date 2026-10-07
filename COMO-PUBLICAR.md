# Como publicar o site e as novidades

## 1. Colocar o site no ar (uma vez só)
1. No GitHub, crie um repositório (ex.: `fraternidade`) e envie todos os arquivos desta pasta.
2. Em **Settings > Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. O site fica em `https://SEU-USUARIO.github.io/fraternidade/`.

## 2. Quem pode publicar
Quem tem permissão de escrita no repositório é administrador do site.
Para adicionar alguém: **Settings > Collaborators > Add people** (permissão Write).

## 3. Criar o token de acesso (cada administrador, uma vez)
1. GitHub > foto do perfil > **Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token**.
2. Em **Repository access**, escolha **Only select repositories** e marque o repositório do site.
3. Em **Permissions > Repository permissions**, coloque **Contents: Read and write**.
4. Defina uma validade (ex.: 90 dias) e gere. Copie o token (ele só aparece uma vez).
   - Se o repositório não aparecer na lista, use **Tokens (classic)** com a permissão `public_repo` (repositório público) ou `repo` (privado).

## 4. Publicar
1. Abra `https://SEU-USUARIO.github.io/fraternidade/admin.html`.
2. Preencha `usuario/repositorio`, o branch (`main`) e o token, e clique em **Entrar**.
3. Escreva a novidade (português e, se quiser, espanhol) e clique em **Publicar**.
4. Em cerca de 1 minuto o site atualiza. Também dá para editar e excluir novidades antigas ali mesmo.

## Cuidados
- O token funciona como senha: não compartilhe e não marque "Lembrar neste computador" em computadores de uso comum.
- Cada publicação vira um commit no repositório, então há histórico de quem publicou e o que mudou.
- As novidades ficam no arquivo `posts.json`. Para testar o site no seu computador, use um servidor local (ex.: `python -m http.server`), pois abrir o arquivo direto não carrega o `posts.json`.
