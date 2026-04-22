'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { APP_DESCRIPTION, APP_NAME, PORTAL_NAME } from '@/lib/branding'
import { Icon } from '@/components/ui/Icon'

const PRODUCT_OPTIONS: Array<{ value: 'CMMS' | 'GVP' | 'GPA'; label: string; description: string; disabled?: boolean }> = [
  { value: 'CMMS', label: 'CMMS — Gestão de Manutenção', description: 'Controle operacional de manutenção de ativos industriais.' },
  { value: 'GVP', label: 'GVP — Gestão de Variáveis de Processo', description: 'Em breve. Monitoramento de variáveis operacionais.', disabled: true },
  { value: 'GPA', label: 'GPA — Gestão de Portaria e Acesso', description: 'Em breve. Controle de acesso e leitura de placas.', disabled: true },
]

type FormState = {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  companyEmail: string
  companyPhone: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  products: Array<'CMMS' | 'GVP' | 'GPA'>
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    cnpj: '', razaoSocial: '', nomeFantasia: '', companyEmail: '', companyPhone: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
    firstName: '', lastName: '', email: '', password: '', phone: '',
    products: ['CMMS'],
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)

  const update = (key: keyof FormState, value: string | string[]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleCnpjBlur = async () => {
    const digits = form.cnpj.replace(/\D/g, '')
    if (digits.length !== 14) return
    setLookupLoading(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
      if (!res.ok) return
      const data = await res.json()
      setForm((f) => ({
        ...f,
        razaoSocial: data.razao_social ?? f.razaoSocial,
        nomeFantasia: data.nome_fantasia ?? f.nomeFantasia,
        companyEmail: data.email ?? f.companyEmail,
        companyPhone: data.ddd_telefone_1 ?? f.companyPhone,
        cep: data.cep ?? f.cep,
        logradouro: data.logradouro ?? f.logradouro,
        numero: data.numero ?? f.numero,
        complemento: data.complemento ?? f.complemento,
        bairro: data.bairro ?? f.bairro,
        cidade: data.municipio ?? f.cidade,
        uf: data.uf ?? f.uf,
      }))
    } catch {
      // sem bloqueio — usuário pode preencher manualmente
    } finally {
      setLookupLoading(false)
    }
  }

  const toggleProduct = (value: 'CMMS' | 'GVP' | 'GPA') => {
    setForm((f) => {
      const has = f.products.includes(value)
      return { ...f, products: has ? f.products.filter((p) => p !== value) : [...f.products, value] }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.products.length === 0) {
      setError('Selecione ao menos um produto.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao criar cadastro')
        setLoading(false)
        return
      }
      router.push('/register/pending')
    } catch {
      setError('Erro ao conectar ao servidor')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,220,198,0.30),_transparent_30%),linear-gradient(180deg,#fbfbfb_0%,#f1f4f4_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl w-full">
        <div className="mb-6">
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon name="arrow_back" className="text-base" />
            Voltar ao {PORTAL_NAME}
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14 rounded-[4px] bg-primary-graphite flex items-center justify-center">
            <Icon name="hub" className="text-3xl text-white" />
          </div>
          <p className="label-uppercase mb-2">Cadastre sua empresa</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-2">{APP_NAME}</h1>
          <p className="text-muted-foreground">{APP_DESCRIPTION}</p>
        </div>

        <Card className="bg-card/95">
          <CardHeader>
            <CardTitle>Novo cadastro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-[4px] bg-danger-light px-4 py-3 text-danger-light-foreground text-sm">
                  {error}
                </div>
              )}

              <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Dados da empresa</h2>
                <Input
                  label={lookupLoading ? 'CNPJ (buscando...)' : 'CNPJ'}
                  value={form.cnpj}
                  onChange={(e) => update('cnpj', e.target.value)}
                  onBlur={handleCnpjBlur}
                  placeholder="00.000.000/0000-00"
                  required
                />
                <Input label="Razão Social" value={form.razaoSocial} onChange={(e) => update('razaoSocial', e.target.value)} required />
                <Input label="Nome Fantasia" value={form.nomeFantasia} onChange={(e) => update('nomeFantasia', e.target.value)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="E-mail da empresa" type="email" value={form.companyEmail} onChange={(e) => update('companyEmail', e.target.value)} preserveCase />
                  <Input label="Telefone da empresa" value={form.companyPhone} onChange={(e) => update('companyPhone', e.target.value)} />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Endereço</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label="CEP" value={form.cep} onChange={(e) => update('cep', e.target.value)} />
                  <Input label="UF" value={form.uf} onChange={(e) => update('uf', e.target.value)} />
                  <Input label="Cidade" value={form.cidade} onChange={(e) => update('cidade', e.target.value)} />
                </div>
                <Input label="Logradouro" value={form.logradouro} onChange={(e) => update('logradouro', e.target.value)} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label="Número" value={form.numero} onChange={(e) => update('numero', e.target.value)} />
                  <Input label="Complemento" value={form.complemento} onChange={(e) => update('complemento', e.target.value)} />
                  <Input label="Bairro" value={form.bairro} onChange={(e) => update('bairro', e.target.value)} />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Administrador inicial</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Nome" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
                  <Input label="Sobrenome" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required />
                </div>
                <Input label="E-mail de acesso" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required preserveCase />
                <Input label="Telefone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                <Input label="Senha" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required preserveCase />
                <p className="text-xs text-muted-foreground">
                  Mínimo 10 caracteres, com maiúscula, minúscula, número e caractere especial.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Produtos</h2>
                {PRODUCT_OPTIONS.map((opt) => {
                  const checked = form.products.includes(opt.value)
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 rounded-[4px] border p-3 cursor-pointer transition-colors ${
                        checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                      } ${opt.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={opt.disabled}
                        onChange={() => !opt.disabled && toggleProduct(opt.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-semibold text-foreground">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </label>
                  )
                })}
              </section>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar cadastro'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
                  Entrar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
