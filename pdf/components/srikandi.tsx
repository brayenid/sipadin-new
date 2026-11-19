import React from 'react'
import { View, Text } from '@react-pdf/renderer'

export const SRIKANDI_TAGS = {
  nomor: '${nomor_naskah}',
  tanggal: '${tanggal_naskah}',
  ttd: '${ttd_pengirim}',
  ttdIndexed: (_index?: number) => '${ttd_pengirim}',
}

export type SrikandiSignatureProps = {
  isSrikandi?: boolean
  index?: number
  standardHeight?: number
  srikandiHeight?: number
  offset?: string | number
  style?: any
}

/**
 * Komponen Signature Area khusus untuk mendukung dokumen standar dan versi SRIKANDI.
 *
 * Pada versi SRIKANDI:
 * - Memberikan ruang vertikal yang lebih luas (default 70pt) untuk QR Code TTE.
 * - Posisi teks `${ttd_pengirim}` tidak dibuat 'center' penuh melainkan digeser
 *   ke arah garis tengah (offset ~45%) karena algoritma Srikandi menempatkan titik tengah
 *   QR Code tepat pada awal mula (karakter awal) teks `${ttd_pengirim}`.
 */
export function SrikandiSignature({
  isSrikandi = false,
  index,
  standardHeight = 40,
  srikandiHeight = 72,
  offset = '45%',
  style,
}: SrikandiSignatureProps) {
  if (!isSrikandi) {
    return <View style={[{ height: standardHeight }, style]} />
  }

  const code = SRIKANDI_TAGS.ttd

  return (
    <View
      style={[
        {
          height: srikandiHeight,
          justifyContent: 'center',
          width: '100%',
        },
        style,
      ]}
    >
      <View
        style={{
          paddingLeft: typeof offset === 'number' ? offset : offset,
        }}
      >
        <Text
          style={{
            fontSize: 9,
            fontFamily: 'Helvetica',
            color: '#000000',
          }}
        >
          {code}
        </Text>
      </View>
    </View>
  )
}
