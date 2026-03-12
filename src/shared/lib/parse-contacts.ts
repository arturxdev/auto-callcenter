import Papa from "papaparse"
import * as XLSX from "xlsx"

export interface ParsedContact {
  firstName: string | null
  lastName: string | null
  phone: string
  address: string | null
}

const HEADER_MAP: Record<string, keyof ParsedContact> = {
  phone: "phone",
  telefono: "phone",
  teléfono: "phone",
  nombre: "firstName",
  firstname: "firstName",
  first_name: "firstName",
  apellido: "lastName",
  lastname: "lastName",
  last_name: "lastName",
  direccion: "address",
  dirección: "address",
  address: "address",
}

function normalizeHeader(raw: string): keyof ParsedContact | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_")
  return HEADER_MAP[key] ?? null
}

function rowsToContacts(
  rows: Record<string, string>[]
): ParsedContact[] {
  if (rows.length === 0) return []

  const headers = Object.keys(rows[0])
  const mapping: Record<string, keyof ParsedContact> = {}
  for (const h of headers) {
    const mapped = normalizeHeader(h)
    if (mapped) mapping[h] = mapped
  }

  if (!Object.values(mapping).includes("phone")) {
    throw new Error("La columna 'phone' o 'telefono' es requerida")
  }

  const contacts: ParsedContact[] = []
  for (const row of rows) {
    const contact: ParsedContact = {
      firstName: null,
      lastName: null,
      phone: "",
      address: null,
    }
    for (const [original, mapped] of Object.entries(mapping)) {
      const val = row[original]?.trim() || null
      if (mapped === "phone") {
        contact.phone = val ?? ""
      } else {
        contact[mapped] = val
      }
    }
    if (contact.phone) {
      contacts.push(contact)
    }
  }
  return contacts
}

export async function parseContactsFile(
  buffer: Buffer,
  filename: string
): Promise<ParsedContact[]> {
  const ext = filename.toLowerCase().split(".").pop()

  if (ext === "csv") {
    const text = buffer.toString("utf-8")
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    })
    return rowsToContacts(result.data)
  }

  if (ext === "xlsx" || ext === "xls") {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(
      workbook.Sheets[sheetName],
      { defval: "" }
    )
    return rowsToContacts(rows)
  }

  throw new Error(`Formato de archivo no soportado: .${ext}`)
}
