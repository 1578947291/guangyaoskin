import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, Trash2, UserPlus, X } from 'lucide-react'
import { Modal } from '../components/Modal'
import { EmptyState, PageHeader } from '../components/PageElements'
import { db } from '../db'
import type { Notify } from '../types'

interface RegistrationPageProps {
  notify: Notify
}

export function RegistrationPage({ notify }: RegistrationPageProps) {
  const customers = useLiveQuery(() => db.customers.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [skinNotes, setSkinNotes] = useState('')

  const filtered = customers.filter((customer) => {
    const keyword = search.trim().toLocaleLowerCase('zh-CN')
    if (!keyword) return true
    return customer.name.toLocaleLowerCase('zh-CN').includes(keyword) || customer.phone.includes(keyword)
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await db.customers.add({
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      skinNotes: skinNotes.trim(),
      createdAt: new Date().toISOString()
    })
    setName('')
    setPhone('')
    setSkinNotes('')
    setOpen(false)
    notify('顾客档案已保存')
  }

  const remove = async (id: string) => {
    if (!window.confirm('确定删除这份顾客档案吗？')) return
    await db.customers.delete(id)
    notify('顾客档案已删除')
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="CLIENTS"
        title="登记"
        subtitle="沉淀顾客资料与护理记录"
        action={<button className="action-button" type="button" onClick={() => setOpen(true)}><UserPlus size={17} />新增</button>}
      />

      <label className="search-box">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">搜索姓名或手机号</span>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索姓名或手机号" />
        {search ? <button type="button" onClick={() => setSearch('')} aria-label="清除搜索" title="清除搜索"><X size={17} /></button> : null}
      </label>

      {customers.length === 0 ? (
        <EmptyState icon={UserPlus} title="还没有顾客档案" message="点击右上角登记第一位顾客" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="没有匹配结果" message="换一个姓名或手机号试试" />
      ) : (
        <div className="record-list customer-list">
          {filtered.map((customer) => (
            <article className="record-row customer-row surface" key={customer.id}>
              <span className="avatar" aria-hidden="true">{customer.name.slice(0, 1)}</span>
              <div className="record-copy">
                <h2>{customer.name}</h2>
                <small>{customer.phone || '未填写手机号'}</small>
              </div>
              {customer.skinNotes ? <span className="skin-note" title={customer.skinNotes}>{customer.skinNotes}</span> : null}
              <button className="danger-icon-button" type="button" onClick={() => remove(customer.id)} aria-label="删除顾客档案" title="删除顾客档案"><Trash2 size={17} /></button>
            </article>
          ))}
        </div>
      )}

      <Modal title="顾客登记" open={open} onClose={() => setOpen(false)}>
        <form className="data-form" onSubmit={submit}>
          <label>姓名<input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
          <label>手机号<input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" /></label>
          <label className="full-field">肤质与护理备注<textarea value={skinNotes} onChange={(event) => setSkinNotes(event.target.value)} rows={4} placeholder="例如：敏感肌、需避开酸类" /></label>
          <div className="form-actions full-field">
            <button className="secondary-button" type="button" onClick={() => setOpen(false)}>取消</button>
            <button className="primary-button" type="submit">保存档案</button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
