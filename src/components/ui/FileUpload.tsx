import { useState, useRef } from 'react'
import { Icon } from './Icon'
import { Button } from './Button'

interface UploadedFile {
  name: string
  url: string
  size: number
  type: string
}

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void
  existingFiles?: UploadedFile[]
  accept?: string
  maxFiles?: number
}

export function FileUpload({
  onFilesUploaded,
  existingFiles = [],
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
  maxFiles = 10
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = async (newFiles: File[]) => {
    if (files.length + newFiles.length > maxFiles) {
      alert(`Máximo de ${maxFiles} arquivos permitidos`)
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      newFiles.forEach(file => formData.append('files', file))

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        throw new Error('Upload failed')
      }

      const data = await res.json()
      const uploadedFiles = [...files, ...data.files]
      setFiles(uploadedFiles)
      onFilesUploaded(uploadedFiles)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Erro ao fazer upload dos arquivos')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFilesUploaded(newFiles)
  }

  const getFileIconName = (type: string): string => {
    if (type.startsWith('image/')) return 'image'
    if (type.includes('pdf')) return 'picture_as_pdf'
    if (type.includes('word') || type.includes('document')) return 'description'
    if (type.includes('sheet') || type.includes('excel')) return 'table_chart'
    return 'attach_file'
  }

  const getFileIconColor = (type: string): string => {
    if (type.startsWith('image/')) return 'text-info'
    if (type.includes('pdf')) return 'text-danger'
    if (type.includes('word') || type.includes('document')) return 'text-primary'
    if (type.includes('sheet') || type.includes('excel')) return 'text-success'
    return 'text-muted-foreground'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-[4px] p-6 text-center ${
          dragActive ? 'border-primary bg-primary/5' : 'border-on-surface-variant/20'
        } ${uploading ? 'opacity-50' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center">
            <Icon name="progress_activity" className="text-5xl text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Fazendo upload...</p>
          </div>
        ) : (
          <>
            <Icon name="cloud_upload" className="text-5xl text-muted-foreground mb-3" />
            <p className="text-sm text-foreground mb-2">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Imagens, PDFs, Word, Excel (máx. {maxFiles} arquivos)
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              Selecionar Arquivos
            </Button>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="label-uppercase">
            Arquivos ({files.length}/{maxFiles})
          </h4>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-surface-low rounded-[4px]"
            >
              <Icon name={getFileIconName(file.type)} className={`text-3xl ${getFileIconColor(file.type)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              {file.type.startsWith('image/') && (
                <img
                  src={file.url}
                  alt={file.name}
                  className="h-12 w-12 object-cover rounded-[4px]"
                />
              )}
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-surface-container rounded-[4px]"
                type="button"
              >
                <Icon name="close" className="text-xl text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
