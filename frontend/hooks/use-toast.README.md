# useToast Hook - Documentação Completa

## Visão Geral
Este é um **sistema de gestão de notificações toast** inspirado na biblioteca `react-hot-toast`. Permite mostrar mensagens temporárias ao utilizador (sucessos, erros, avisos, etc.) de forma centralizada e controlada.

## Arquitetura do Sistema

### 1. **Estado Global com Padrão Reducer**
O sistema usa um **estado global partilhado** fora do React, gerido manualmente através de um padrão reducer (similar ao Redux).

```typescript
let memoryState: State = { toasts: [] };
const listeners: Array<(state: State) => void> = [];
```

**Porquê fazer isto?**
- Permite chamar `toast()` de **qualquer lugar** do código (mesmo fora de componentes React)
- Todos os componentes que usam `useToast()` partilham o mesmo estado
- Evita prop drilling ou context providers complexos

---

## Componentes Principais

### 1. **Constantes de Configuração**

```typescript
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;
```

- **TOAST_LIMIT**: Número máximo de toasts visíveis simultaneamente (atualmente 1)
- **TOAST_REMOVE_DELAY**: Tempo em milissegundos antes de remover o toast do estado (1000 segundos = ~16 minutos) ⚠️ **VALOR MUITO ALTO - POSSÍVEL BUG**

---

### 2. **Sistema de Tipos**

#### ToasterToast
```typescript
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};
```
Representa um toast individual com:
- `id`: Identificador único
- `title`: Título da notificação
- `description`: Descrição/mensagem
- `action`: Botão de ação opcional
- `...ToastProps`: Propriedades do componente UI (variant, open, etc.)

#### Actions
```typescript
type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string }
```

Quatro ações possíveis:
- **ADD_TOAST**: Adiciona novo toast
- **UPDATE_TOAST**: Atualiza toast existente
- **DISMISS_TOAST**: Inicia animação de fecho
- **REMOVE_TOAST**: Remove toast do estado completamente

---

### 3. **Sistema de IDs**

```typescript
let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}
```

Gera IDs únicos sequenciais (1, 2, 3...) com reset ao atingir o valor máximo seguro do JavaScript.

---

### 4. **Reducer - Lógica de Estado**

```typescript
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    // ... outros cases
  }
};
```

#### **ADD_TOAST**
- Adiciona novo toast no **início** do array
- Limita a `TOAST_LIMIT` toasts (remove os mais antigos)

#### **UPDATE_TOAST**
- Atualiza propriedades de um toast específico (útil para mudar título, descrição, etc.)

#### **DISMISS_TOAST**
- Marca o toast como `open: false` (inicia animação de saída)
- **Efeito colateral**: Agenda a remoção completa via `addToRemoveQueue()`

#### **REMOVE_TOAST**
- Remove toast do array definitivamente
- Se `toastId === undefined`, remove **todos** os toasts

---

### 5. **Sistema de Remoção Temporizada**

```typescript
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) return;

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId: toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};
```

**Funcionamento:**
1. Quando um toast é "dismissed", agenda sua remoção
2. Usa `Map` para rastrear timeouts por ID
3. Previne múltiplos timeouts para o mesmo toast
4. Após `TOAST_REMOVE_DELAY`, remove o toast completamente

⚠️ **PROBLEMA ATUAL**: Delay de 1000 segundos é excessivo - toasts permanecem na memória muito tempo

---

### 6. **Sistema de Dispatch e Listeners**

```typescript
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}
```

**Padrão Observer:**
- `dispatch()` atualiza o estado global
- Notifica todos os listeners (componentes React) da mudança
- Cada componente re-renderiza com o novo estado

---

### 7. **Função Toast (API Pública)**

```typescript
function toast({ ...props }: Toast) {
  const id = genId();

  const update = (props: ToasterToast) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } });
  
  const dismiss = () => 
    dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return { id, dismiss, update };
}
```

**Fluxo:**
1. Gera ID único
2. Cria funções `update` e `dismiss` para este toast específico
3. Adiciona toast ao estado com `open: true`
4. Conecta `onOpenChange` ao `dismiss` (quando UI fecha, dispara dismiss)
5. Retorna objeto com métodos de controle

**Uso:**
```typescript
const { id, dismiss, update } = toast({
  title: "Sucesso!",
  description: "Operação concluída"
});

// Depois...
update({ description: "Nova mensagem" });
dismiss();
```

---

### 8. **Hook useToast**

```typescript
function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => 
      dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}
```

**Funcionamento:**
1. Cria estado local React sincronizado com `memoryState`
2. **useEffect**: Registra `setState` como listener
3. **Cleanup**: Remove listener quando componente desmonta
4. Retorna:
   - `toasts`: Array de toasts atuais
   - `toast`: Função para criar toasts
   - `dismiss`: Função para fechar toasts

⚠️ **PROBLEMA**: Dependência `[state]` causa re-registro desnecessário do listener

---

## Fluxo Completo de um Toast

```
1. Chamada: toast({ title: "Olá" })
   ↓
2. genId() gera ID único
   ↓
3. dispatch({ type: "ADD_TOAST", ... })
   ↓
4. reducer adiciona toast ao array
   ↓
5. listeners notificados (componentes re-renderizam)
   ↓
6. UI mostra o toast
   ↓
7. Utilizador fecha OU timeout
   ↓
8. onOpenChange(false) → dismiss()
   ↓
9. dispatch({ type: "DISMISS_TOAST" })
   ↓
10. reducer marca open: false + addToRemoveQueue()
   ↓
11. UI anima saída
   ↓
12. Após TOAST_REMOVE_DELAY
   ↓
13. dispatch({ type: "REMOVE_TOAST" })
   ↓
14. Toast removido do estado
```

---

## Problemas e Melhorias Identificadas

### ⚠️ Problemas Críticos

1. **TOAST_REMOVE_DELAY excessivo (1000 segundos)**
   - **Impacto**: Toasts permanecem na memória ~16 minutos
   - **Sugestão**: Reduzir para 5000-10000ms (5-10 segundos)

2. **Dependência incorreta no useEffect**
   ```typescript
   }, [state]); // ❌ Causa re-registros
   ```
   - **Impacto**: Listener é re-adicionado a cada mudança de estado
   - **Sugestão**: Usar `[]` (registar apenas uma vez)

3. **TOAST_LIMIT = 1 muito restritivo**
   - Apenas 1 toast visível de cada vez
   - Pode não ser o comportamento desejado

### 💡 Melhorias Sugeridas

1. **Auto-dismiss configurável**
   ```typescript
   toast({
     title: "Mensagem",
     duration: 5000 // Auto-dismiss após 5s
   });
   ```

2. **Tipos de toast predefinidos**
   ```typescript
   toast.success("Guardado!");
   toast.error("Erro ao guardar");
   toast.warning("Atenção!");
   ```

3. **Posicionamento configurável**
   - Top, bottom, left, right, center

4. **Gestão de memória**
   - Limpar timeouts quando componente desmonta
   - Prevenir memory leaks

5. **TypeScript mais rigoroso**
   - Tornar `title` ou `description` obrigatórios
   - Validação de props

---

## Exemplos de Uso

### Uso Básico
```typescript
import { toast } from "@/hooks/use-toast";

function MyComponent() {
  const handleClick = () => {
    toast({
      title: "Guardado com sucesso!",
      description: "As suas alterações foram guardadas.",
    });
  };

  return <button onClick={handleClick}>Guardar</button>;
}
```

### Com Componente
```typescript
function MyComponent() {
  const { toast } = useToast();

  return (
    <button onClick={() => toast({ title: "Clicado!" })}>
      Clique aqui
    </button>
  );
}
```

### Com Controle Manual
```typescript
const { id, dismiss, update } = toast({
  title: "A processar...",
  description: "Por favor aguarde"
});

// Simular operação assíncrona
setTimeout(() => {
  update({
    title: "Concluído!",
    description: "Operação terminada com sucesso"
  });
  
  setTimeout(dismiss, 2000);
}, 3000);
```

### Com Ação
```typescript
toast({
  title: "Tem a certeza?",
  description: "Esta ação não pode ser desfeita",
  action: <button onClick={() => confirmar()}>Confirmar</button>
});
```

---

## Estrutura de Ficheiros Relacionados

```
frontend/hooks/
  ├── use-toast.ts          # Este ficheiro (lógica)
  └── use-toast.README.md   # Esta documentação

frontend/components/ui/
  └── toast.tsx             # Componente visual (assumido)
```

---

## Conceitos Técnicos Utilizados

1. **Padrão Observer**: Sistema de listeners/subscribers
2. **Reducer Pattern**: Gestão de estado previsível
3. **Closure**: Funções `update` e `dismiss` capturam `id`
4. **Side Effects**: `addToRemoveQueue` dentro do reducer
5. **Estado Global sem Context**: Estado fora do React
6. **TypeScript Discriminated Unions**: Type Action
7. **Módulo Singleton**: Um único estado partilhado

---

## Perguntas Frequentes

**Q: Posso chamar `toast()` fora de componentes React?**  
A: Sim! É uma das vantagens desta implementação.

**Q: Quantos toasts posso mostrar simultaneamente?**  
A: Atualmente apenas 1 (`TOAST_LIMIT = 1`).

**Q: Os toasts persistem após refresh?**  
A: Não, o estado está apenas em memória.

**Q: Como personalizar a aparência?**  
A: Através do componente `Toast` UI e das props `variant`, `className`, etc.

**Q: Posso ter toasts com durações diferentes?**  
A: Atualmente não está implementado, mas seria uma boa melhoria.

---

## Próximos Passos para Melhorias

1. ✅ Corrigir `TOAST_REMOVE_DELAY` para valor razoável
2. ✅ Corrigir dependências do `useEffect`
3. ✅ Adicionar auto-dismiss configurável
4. ✅ Criar métodos auxiliares (`toast.success`, etc.)
5. ✅ Implementar sistema de queue mais robusto
6. ✅ Adicionar testes unitários
7. ✅ Documentar componente UI Toast
8. ✅ Implementar diferentes posições
9. ✅ Adicionar animações configuráveis
10. ✅ Gestão de memória melhorada

---

## Resumo Técnico

Este é um **sistema de notificações toast híbrido** que combina:
- Estado global JavaScript (fora do React)
- Hooks React para sincronização
- Padrão Reducer para gestão de estado
- Sistema de listeners para reatividade

**Vantagens:**
- ✅ Simples de usar
- ✅ Funciona em qualquer lugar
- ✅ Sem prop drilling
- ✅ Performance boa

**Desvantagens:**
- ❌ Estado não persiste
- ❌ Debugging mais difícil (estado fora do React DevTools)
- ❌ Possíveis memory leaks se não limpar listeners
- ❌ Configurações atuais têm bugs (delay excessivo)

---

**Autor**: Sistema de Toast baseado em react-hot-toast  
**Versão**: 1.0  
**Última atualização**: Análise em 31/12/2025
