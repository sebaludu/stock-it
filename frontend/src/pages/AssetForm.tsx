import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAsset, getAssetTypes, createAsset, updateAsset } from '../api/assets'
import { ArrowLeft } from 'lucide-react'

export default function AssetForm() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: types = [] } = useQuery({ queryKey: ['asset-types'], queryFn: getAssetTypes })
  const { data: existing } = useQuery({
    queryKey: ['asset', Number(id)],
    queryFn: () => getAsset(Number(id)),
    enabled: isEdit,
  })

  const [form, setForm] = useState({
    description: '',
    asset_type_id: '',
    brand: '',
    model: '',
    serial_number: '',
    safety_stock: '0',
    initial_stock: '0',
    status: 'DISPONIBLE',
    purchase_date: '',
    notes: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing) {
      setForm({
        description: existing.description,
        asset_type_id: String(existing.asset_type_id),
        brand: existing.brand ?? '',
        model: existing.model ?? '',
        serial_number: existing.serial_number ?? '',
        safety_stock: String(existing.safety_stock),
        initial_stock: '0',
        status: existing.status,
        purchase_date: existing.purchase_date ?? '',
        notes: existing.notes ?? '',
      })
    }
  }, [existing])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        description: form.description,
        asset_type_id: Number(form.asset_type_id),
        brand: form.brand || undefined,
        model: form.model || undefined,
        serial_number: form.serial_number || undefined,
        safety_stock: Number(form.safety_stock),
        status: form.status,
        purchase_date: form.purchase_date || undefined,
        notes: form.notes || undefined,
        ...(!isEdit && { initial_stock: Number(form.initial_stock) }),
      }
      if (isEdit) return updateAsset(Number(id), payload)
      return createAsset(payload)
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      navigate(`/assets/${data.id}`)
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Error al guardar el activo')
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{isEdit ? 'Editar Activo' : 'Nuevo Activo'}</h2>

        <form
          onSubmit={(e) => { e.preventDefault(); setError(''); mutation.mutate() }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
              <input value={form.description} onChange={set('description')} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de activo *</label>
              <select value={form.asset_type_id} onChange={set('asset_type_id')} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar...</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select value={form.status} onChange={set('status')} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {['DISPONIBLE', 'ASIGNADO', 'REPARACION', 'DAÑADO', 'PERDIDO'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input value={form.brand} onChange={set('brand')} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <input value={form.model} onChange={set('model')} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° de serie</label>
              <input value={form.serial_number} onChange={set('serial_number')} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock de seguridad</label>
              <input type="number" min="0" value={form.safety_stock} onChange={set('safety_stock')} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
                <input type="number" min="0" value={form.initial_stock} onChange={set('initial_stock')} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de compra</label>
              <input type="date" value={form.purchase_date} onChange={set('purchase_date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea value={form.notes} onChange={set('notes')} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isPending} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
