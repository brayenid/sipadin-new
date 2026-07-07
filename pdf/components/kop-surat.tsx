import React from 'react'
import { Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import '@/pdf/fonts'

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    marginBottom: 10,
    paddingBottom: 8
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoWrap: {
    width: 76,
    height: 76,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logo: {
    width: 72,
    height: 72,
    objectFit: 'contain'
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  instansi1: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    lineHeight: 1.15
  },
  instansi2: {
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 2,
    lineHeight: 1.15
  },
  alamat: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 1.15
  },
  lineWrap: {
    marginTop: 8,
    width: '100%',
    flexDirection: 'column'
  },
  lineThick: {
    borderBottomWidth: 2.5,
    borderBottomColor: '#000',
    marginBottom: 1.5
  },
  lineThin: {
    borderBottomWidth: 1,
    borderBottomColor: '#000'
  },
  title: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textDecoration: 'underline',
    letterSpacing: 0.3
  }
})

export type KopSuratProps = {
  title?: string
  instansiLine1: string
  instansiLine2: string
  alamatLine: string
  logoUrl?: string
  useBookman?: boolean
}

export default function KopSurat({
  title,
  instansiLine1,
  instansiLine2,
  alamatLine,
  logoUrl = '/logo.png',
  useBookman = false
}: KopSuratProps) {
  return (
    <View style={[styles.header, { fontFamily: useBookman ? 'Bookman' : 'Helvetica' }]}>
      <View style={styles.headerRow}>
        <View style={styles.logoWrap}>
          {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.instansi1}>{instansiLine1}</Text>
          <Text style={styles.instansi2}>{instansiLine2}</Text>
          {alamatLine.replace(/\\n/g, '\n').split('\n').map((line, idx) => (
            <Text key={idx} style={[styles.alamat, useBookman ? { fontSize: 8 } : {}]}>{line}</Text>
          ))}
        </View>
        <View style={{ width: 48 }} />
      </View>
      <View style={styles.lineWrap}>
        <View style={styles.lineThick} />
        <View style={styles.lineThin} />
      </View>
      {title && <Text style={styles.title}>{title}</Text>}
    </View>
  )
}
