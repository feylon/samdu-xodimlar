import type { OrganizationPublic, OrganizationSettings } from '~/types/api'
import { applyBrandColor } from '~/utils/color'

const DEFAULT_BRANDING: OrganizationPublic = {
  name: 'Xodimlar HRMS',
  description: null,
  logoFileId: null,
  logoUrl: null,
  primaryColor: '#1d4ed8',
  currency: 'UZS',
  timezone: 'Asia/Tashkent',
}

export const useOrganizationStore = defineStore('organization', () => {
  const branding = ref<OrganizationPublic>(DEFAULT_BRANDING)
  const settings = ref<OrganizationSettings | null>(null)
  const loaded = ref(false)

  const name = computed(() => branding.value.name)
  const currency = computed(() => branding.value.currency)
  const logoUrl = computed(() => branding.value.logoUrl)
  const monogram = computed(() => {
    const words = branding.value.name.split(/\s+/).filter(Boolean)
    const letters = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase())
    return letters.join('') || 'HR'
  })

  const applyBranding = () => {
    applyBrandColor(branding.value.primaryColor)
    if (typeof document !== 'undefined') document.title = branding.value.name
  }

  const loadPublic = async () => {
    const config = useRuntimeConfig()
    const data = await $fetch<OrganizationPublic>('/organization/public', { baseURL: config.public.apiBase })
    branding.value = { ...DEFAULT_BRANDING, ...data }
    loaded.value = true
    applyBranding()
  }

  const loadSettings = async () => {
    const api = useApi()
    const data = await api.get<OrganizationSettings>('/organization')
    settings.value = data
    branding.value = {
      name: data.name,
      description: data.description,
      logoFileId: data.logoFileId,
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor,
      currency: data.currency,
      timezone: data.timezone,
    }
    applyBranding()
    return data
  }

  const previewColor = (hex: string) => {
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) applyBrandColor(hex)
  }

  return { branding, settings, loaded, name, currency, logoUrl, monogram, loadPublic, loadSettings, applyBranding, previewColor }
})
