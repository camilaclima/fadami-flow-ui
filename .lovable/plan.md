## Nova aba "Relatório Executivo" no Painel da Daily (só para Admin)

Uma aba exclusiva do Admin dentro do Painel da Daily que monta um relatório diário automático, permite marcações manuais no histórico e exporta em PDF ou texto.

---

### 1. O que aparece na tela

Dentro do **Painel da Daily**, uma nova aba **"Relatório Executivo"** — visível apenas para quem tem perfil Admin.

No topo da aba: seletor de **data** da emissão do relatório (padrão: hoje).

Abaixo, oito cartões, um para cada tópico do relatório:

1. **Bom exemplo por squad** — vem das marcações manuais do Admin.
2. **Melhor squad** — vem das marcações manuais do Admin.
3. **Preenchimentos incorretos ou vagos** — automático (regras) + marcações manuais.
4. **Faltas recentes** — automático.
5. **Sem pré-daily no prazo** — automático.
6. **Aguardando tarefas** — automático (palavras-chave) + marcações manuais.
7. **Tarefas repetidas ou estagnadas** — automático.
8. **Impedimentos e bloqueios** — automático (abertos e fechados no dia).

Em cada item dos cartões:

- Uma **chave "Incluir no Relatório Final"** já vem ligada.
- O texto é **editável** direto na tela antes de exportar.
- O Admin pode desligar itens que não quer no relatório final.

No rodapé da aba, dois botões:

- **Gerar PDF** — abre a impressão do navegador com o layout limpo do sistema.
- **Copiar Texto Formatado** — copia o relatório pronto para colar em e-mail ou chat.

---

### 2. Regras automáticas (sem uso de IA)

O sistema aplica estas regras direto no código, olhando o que já está no banco:

- **Sem pré-daily no prazo**: quem enviou o registro depois do início da daily da squad, ou não enviou até o encerramento.
- **Aguardando tarefas**: o texto do campo "Hoje" contém qualquer uma destas expressões (sem diferenciar maiúsculas/acentos): *aguardando, no aguardo, sem card, sem demanda, a definir, aguardando definição, sem tarefa*.
- **Preenchimento curto/incompleto**: quando "Ontem" ou "Hoje" tem menos de 15 caracteres.
- **Tarefa repetida**: quando o "Hoje" é igual (ou muito parecido) com o "Hoje" que aquele dev escreveu no dia anterior.
- **Faltas**: devs marcados como ausentes em qualquer squad nos últimos 7 dias, mostrando o motivo informado pelo líder (atestado, férias, banco de horas, interjornada, day off etc.).
- **Impedimentos**: lista tudo que foi aberto ou fechado no dia, com urgência e tempo em aberto.

---

### 3. Marcações manuais no Histórico

Dentro do modal de **Histórico da Daily** que já existe, para cada registro de dev, o Admin ganha um seletor de múltipla escolha com estas etiquetas:

- **Bom Exemplo**
- **Melhor Squad**
- **Preenchimento Incorreto ou Incompleto**
- **Aguardando Tarefa**

As escolhas são salvas na hora, ligadas ao registro daquele dev naquele dia. Depois aparecem automaticamente nos cartões do Relatório Executivo.

---

### 4. Como fica salvo

Uma nova tabela no banco guarda essas etiquetas por registro (id do registro do dev + lista de etiquetas). Só quem for Admin consegue criar/alterar. Todos os dados dos relatórios continuam vindo das tabelas que já existem (registros de daily, impedimentos, ausências, reuniões).

---

### 5. Design e desempenho

- Segue o design system atual: cards arredondados, tema escuro/claro, tokens de cor existentes, sem inventar estilo novo.
- O PDF sai limpo (fundo claro, tipografia do sistema, logo Fadami no topo) via impressão nativa do navegador.
- Os dados são carregados em paralelo e ficam em cache para a tela não travar. O estado dos itens (incluído/excluído, texto editado) fica na memória da aba até o Admin fechar.

---

### 6. Onde as coisas serão criadas ou alteradas

Novos:

- Migration para a tabela de etiquetas manuais.
- Página "Relatório Executivo" e seus cartões.
- Arquivo com as regras automáticas.
- Hooks para ler os dados e salvar as etiquetas.

Alterados:

- Painel da Daily: adicionar a nova aba (visível só para Admin).
- Modal de Histórico da Daily e cartão de leitura do dev: adicionar o seletor de etiquetas.