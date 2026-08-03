import { useState, type ChangeEvent } from 'react'
import { CuteIcon } from '../components/CuteIcon'
import { PhotoLightbox } from '../components/PhotoLightbox'
import { db } from '../db'
import { customerPhotos } from '../lib/customerPhotos'
import { preparePhoto } from '../lib/images'
import type { CustomerRecord, Notify } from '../types'

interface CustomerPhotosPageProps {
  customer: CustomerRecord
  notify: Notify
  onBack: () => void
}

export function CustomerPhotosPage({ customer, notify, onBack }: CustomerPhotosPageProps) {
  const [photoBusy, setPhotoBusy] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const photos = customerPhotos(customer)

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return

    setPhotoBusy(true)
    try {
      const addedPhotos = await Promise.all(files.map(preparePhoto))
      const nextPhotos = Array.from(new Set([...photos, ...addedPhotos]))
      await db.customers.update(customer.id, {
        photoDataUrl: nextPhotos[0],
        photoDataUrls: nextPhotos
      })
      notify(`已添加 ${addedPhotos.length} 张客户照片`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '照片处理失败')
    } finally {
      setPhotoBusy(false)
    }
  }

  const removePhoto = async (index: number) => {
    if (!window.confirm(`确定删除第 ${index + 1} 张客户照片吗？`)) return
    const nextPhotos = photos.filter((_, photoIndex) => photoIndex !== index)
    await db.customers.update(customer.id, {
      photoDataUrl: nextPhotos[0],
      photoDataUrls: nextPhotos
    })
    setViewerIndex(null)
    notify('客户照片已删除')
  }

  const showPrevious = () => setViewerIndex((current) => current === null
    ? null
    : (current - 1 + photos.length) % photos.length)
  const showNext = () => setViewerIndex((current) => current === null
    ? null
    : (current + 1) % photos.length)

  return (
    <section className="page customer-photos-page">
      <header className="detail-page-header customer-photos-header">
        <button className="icon-button detail-back-button" type="button" onClick={onBack} aria-label="返回用户详情" title="返回">
          <CuteIcon name="back" size={20} />
        </button>
        <div><h1>照片管理</h1></div>
        <span className="detail-count">{photos.length} 张</span>
      </header>

      <section className="photo-manager-toolbar surface" aria-label="客户照片操作">
        <div>
          <span><CuteIcon name="images" size={18} /></span>
          <div><strong>{customer.name}</strong><small>{photos.length ? `已关联 ${photos.length} 张照片` : '暂无关联照片'}</small></div>
        </div>
        <label className={`secondary-button photo-manager-add${photoBusy ? ' disabled' : ''}`}>
          <input className="visually-hidden-input" type="file" accept="image/*" multiple onChange={addPhotos} disabled={photoBusy} />
          <CuteIcon name="imageAdd" size={17} />{photoBusy ? '处理中...' : '添加照片'}
        </label>
      </section>

      {photos.length ? (
        <section className="photo-manager-grid" aria-label="全部客户照片">
          {photos.map((photo, index) => (
            <article className="photo-manager-item" key={`${photo.slice(-24)}-${index}`}>
              <button className="photo-manager-preview" type="button" onClick={() => setViewerIndex(index)} aria-label={`查看第 ${index + 1} 张客户照片大图`}>
                <img src={photo} alt={`${customer.name}的客户照片 ${index + 1}`} />
                <span><CuteIcon name="expand" size={17} /></span>
              </button>
              <button className="photo-manager-delete" type="button" onClick={() => removePhoto(index)} aria-label={`删除第 ${index + 1} 张客户照片`} title="删除照片">
                <CuteIcon name="delete" size={17} />
              </button>
            </article>
          ))}
        </section>
      ) : (
        <label className="photo-manager-empty surface">
          <input className="visually-hidden-input" type="file" accept="image/*" multiple onChange={addPhotos} disabled={photoBusy} />
          <span><CuteIcon name="imageAdd" size={25} /></span>
          <strong>{photoBusy ? '正在处理照片...' : '添加客户照片'}</strong>
          <small>支持一次选择多张照片</small>
        </label>
      )}

      <PhotoLightbox
        name={customer.name}
        photos={photos}
        activeIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onPrevious={showPrevious}
        onNext={showNext}
      />
    </section>
  )
}
