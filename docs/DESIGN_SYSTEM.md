# 🎨 AdwTech - Design System

## Visão Geral

Sistema de design completo usando tokens semânticos em formato HSL para suporte nativo a dark/light mode.

## 📐 Arquitetura

### Tokens CSS (globals.css)
Todos os tokens são definidos em formato HSL (`240 10% 3.9%`) permitindo manipulação via Tailwind:
- `bg-primary` → `hsl(var(--primary))`
- `bg-primary/50` → `hsl(var(--primary) / 0.5)` (50% opacidade)

### Paleta de Cores

#### Base
```css
--background: 0 0% 100%        /* Fundo principal */
--foreground: 240 10% 3.9%     /* Texto principal */
--card: 0 0% 100%              /* Fundo de cards */
--card-foreground: 240 10% 3.9% /* Texto em cards */
```

#### Primary (Blue)
```css
--primary: 221 83% 53%         /* Cor primária do sistema */
--primary-foreground: 0 0% 100% /* Texto sobre primary */
--primary-hover: 221 83% 45%   /* Hover state */
```

#### Secondary (Gray)
```css
--secondary: 240 4.8% 95.9%
--secondary-foreground: 240 5.9% 10%
--secondary-hover: 240 4.8% 90%
```

#### Status Colors

##### Success (Green)
```css
--success: 142 76% 36%
--success-foreground: 0 0% 100%
--success-light: 142 76% 96%
--success-light-foreground: 142 76% 26%
```

##### Warning (Yellow)
```css
--warning: 38 92% 50%
--warning-foreground: 0 0% 100%
--warning-light: 48 96% 89%
--warning-light-foreground: 32 95% 44%
```

##### Danger (Red)
```css
--danger: 0 84% 60%
--danger-foreground: 0 0% 100%
--danger-light: 0 86% 97%
--danger-light-foreground: 0 74% 42%
```

##### Info (Blue)
```css
--info: 199 89% 48%
--info-foreground: 0 0% 100%
--info-light: 199 89% 96%
--info-light-foreground: 199 89% 38%
```

#### Utility Colors
```css
--muted: 240 4.8% 95.9%
--muted-foreground: 240 3.8% 46.1%
--border: 240 5.9% 90%
--input: 240 5.9% 90%
--ring: 221 83% 53%
```

## 🧩 Componentes

### Button
```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="warning">Warning</Button>
<Button variant="info">Info</Button>

<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

**Variantes:**
- `primary` - Ação principal
- `secondary` - Ação secundária
- `outline` - Ação terciária
- `ghost` - Ação sutil
- `danger` - Ação destrutiva
- `warning` - Ação de alerta
- `info` - Ação informativa

### Badge
```tsx
<Badge variant="default">Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="danger">Danger</Badge>
<Badge variant="info">Info</Badge>
```

### Input
```tsx
<Input label="Nome" required />
<Input label="Email" type="email" error="Email inválido" />
<Input placeholder="Digite algo..." />
```

### Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
  </CardHeader>
  <CardContent>
    Conteúdo do card
  </CardContent>
</Card>
```

### Modal
```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Título do Modal"
  size="lg" // sm, md, lg, xl, xxl, full
>
  Conteúdo do modal
</Modal>
```

## 🎯 Padrões de Uso

### ❌ Não Use
```tsx
// ERRADO - Cores diretas
<div className="bg-blue-600 text-white border-gray-300">

// ERRADO - Cores não semânticas
<button className="bg-red-500 hover:bg-red-700">
```

### ✅ Use
```tsx
// CORRETO - Tokens semânticos
<div className="bg-primary text-primary-foreground border-border">

// CORRETO - Componentes do design system
<Button variant="danger">Excluir</Button>
```

## 🎨 Guia de Uso por Contexto

### Status de OS/RAF
```tsx
// Use getStatusColor() do utils.ts
import { getStatusColor } from '@/lib/utils'

<Badge className={getStatusColor(status)}>{status}</Badge>
```

### Prioridades
```tsx
// Use getPriorityColor() do utils.ts
import { getPriorityColor } from '@/lib/utils'

<Badge className={getPriorityColor(priority)}>{priority}</Badge>
```

### Feedback ao Usuário
```tsx
// Success
<div className="bg-success-light text-success-light-foreground">
  Operação realizada com sucesso
</div>

// Error
<div className="bg-danger-light text-danger-light-foreground">
  Erro ao processar
</div>

// Warning
<div className="bg-warning-light text-warning-light-foreground">
  Atenção necessária
</div>

// Info
<div className="bg-info-light text-info-light-foreground">
  Informação importante
</div>
```

### Layouts
```tsx
// Container principal
<div className="bg-background text-foreground">

// Cards/Painéis
<div className="bg-card text-card-foreground border border-border">

// Sidebar/Navegação
<nav className="bg-card border-r border-border">

// Modais/Popovers
<div className="bg-popover text-popover-foreground">
```

### Estados Interativos
```tsx
// Hover
<button className="hover:bg-accent/10 hover:text-foreground">

// Focus
<input className="focus:ring-2 focus:ring-ring focus:border-transparent">

// Active/Selected
<div className="bg-primary text-primary-foreground">

// Disabled
<button disabled className="opacity-50 cursor-not-allowed">
```

## 🌓 Dark Mode

O sistema suporta dark mode automaticamente. Todas as cores se adaptam via `prefers-color-scheme`.

### Exemplo de Adaptação Automática
```tsx
// Este componente funcionará em ambos os modos
<div className="bg-card text-card-foreground border border-border">
  <h2 className="text-foreground">Título</h2>
  <p className="text-muted-foreground">Descrição</p>
  <Button variant="primary">Ação</Button>
</div>
```

## 📏 Espaçamento e Tipografia

### Escala de Espaçamento
Use a escala padrão do Tailwind: `p-0`, `p-1`, `p-2`, `p-3`, `p-4`, `p-6`, `p-8`, `p-12`, `p-16`

### Hierarquia Tipográfica
```tsx
<h1 className="text-4xl font-bold text-foreground">Heading 1</h1>
<h2 className="text-3xl font-semibold text-foreground">Heading 2</h2>
<h3 className="text-2xl font-semibold text-foreground">Heading 3</h3>
<h4 className="text-xl font-medium text-foreground">Heading 4</h4>
<p className="text-base text-foreground">Body text</p>
<small className="text-sm text-muted-foreground">Small text</small>
```

## 🚨 Checklist de Validação

Antes de commitar código:
- [ ] Zero classes de cores diretas (`text-blue-600`, `bg-red-500`, etc)
- [ ] Todos os tokens são semânticos (`bg-primary`, `text-danger`, etc)
- [ ] Componentes UI usam os componentes base do design system
- [ ] Estados interativos seguem o padrão (hover, focus, active)
- [ ] Feedback ao usuário usa cores de status apropriadas
- [ ] Código funciona em dark mode

## 🔧 Manutenção

### Adicionar Nova Cor
1. Adicione o token em `globals.css` (formato HSL)
2. Adicione ao `@theme inline` para uso no Tailwind
3. Adicione versão dark mode se necessário
4. Documente aqui
5. Atualize componentes afetados

### Modificar Cor Existente
1. Modifique apenas o valor HSL em `globals.css`
2. Sistema inteiro atualiza automaticamente
3. Teste em light e dark mode

## 📚 Referências

- [Tailwind CSS](https://tailwindcss.com)
- [HSL Color Format](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl)
- [shadcn/ui Design Principles](https://ui.shadcn.com)

---

**Última atualização:** 2025-01-11
**Versão:** 2.0
**Responsável:** Sistema AdwTech
