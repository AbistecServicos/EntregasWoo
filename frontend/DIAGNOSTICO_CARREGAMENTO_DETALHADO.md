# 🔍 DIAGNÓSTICO AVANÇADO - Problema de Carregamento

## 📋 PROBLEMA IDENTIFICADO
- **Página trava** quando usuário troca de aba e retorna
- Preciso de F5 para recarregar conteúdo
- Logs mostram: `🔐 AUTH: Auth event: SIGNED_IN` seguido de carregamento inicial, mas a página não rende

## 🚀 LOGS IMPLEMENTADOS

### 1. **UserContext.js** - Logs Detalhados de Carregamento
```javascript
🚀 INICIANDO carregamento de dados do usuário {
  type: 'initial' | 'reload',
  timestamp: '14:32:15',
  page: '/perfil',
  tabVisible: 'visible' | 'hidden',
  windowActive: true | false
}
```

### 2. **perfil.js** - Logs de Efeitos e Estado
```javascript
🔄 PERFIL EFFECT - Executando: {
  timestamp: '14:32:15',
  userLoading: true | false,
  hasUser: true | false,
  hasUserRole: 'admin' | 'gerente' | 'visitante',
  lojasCount: 3,
  page: 'perfil',
  redirecting: false,
  tabVisible: 'visible',
  urlHasCode: false
}
```

### 3. **Cache Inteligente** - Logs de Performance
```javascript
💾 Cache válido, evitando recarregamento {
  cacheAge: 25000, // ms desde último carregamento
  threshold: 30000, // ms de duração do cache
  timestamp: '14:32:15',
  page: '/perfil',
  tabVisible: 'visible'
}
```

## 🎯 HIPÓTESES PARA TESTAR

### **Hipótese A: Problema de Sincronização Contexto/Estado**
- UserContext carrega dados mas React não re-rendera a página
- Componente fica "congelado" mesmo com dados disponíveis

### **Hipótese B: Cache Bug**
- Cache funciona para evitar recarregamento mas causa problema de sincronização
- UI não atualiza com novos dados do contexto

### **Hipótese C: Problema de Timeline**
- Tab switching causa múltiplos eventos `visibilitychange`
- Race condition entre eventos de foco/blur`

## 📊 PRÓXIMOS PASSOS DE TESTE

1. **Trocar de aba** → Verificar logs completos no console
2. **Analisar timing** dos logs para identificar gaps
3. **Verificar** se o problema é específico do ambiente de desenvolvimento
4. **Testar** se `document.visibilityState` e `document.hasFocus()` estão funcionando

## 🔧 MELHORIAS IMPLEMENTADAS

- ✅ Logs detalhados com timestamp e contexto de estado do browser
- ✅ Cache inteligente com logs de performance
- ✅ Eliminação do overhead do `useUserProfile` hook intermediário
- ✅ Acesso direto ao `useUserContext` na página perfil

## 📝 COMANDOS PARA VERIFICAR EM PRODUÇÃO

```bash
# Verificar se problema persiste em produção
npm run build
npm start
```

**Suspeita:** O problema pode ser específico do ambiente de desenvolvimento com Hot Module Replacement (HMR) do Next.js e não ocorrer em produção.

