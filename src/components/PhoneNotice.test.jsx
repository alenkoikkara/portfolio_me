import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PhoneNotice from './PhoneNotice'
import { CONTACT_EMAIL, SOCIAL_LINKS } from '../data/contact'

describe('the phone notice', () => {
  it('asks for a bigger screen and still offers every way to reach out', () => {
    render(<PhoneNotice />)
    expect(screen.getByRole('heading').textContent).toMatch(/bigger screen/)
    expect(screen.getByText('Email').getAttribute('href')).toBe(`mailto:${CONTACT_EMAIL}`)
    expect(screen.getByText('LinkedIn').getAttribute('href')).toBe(SOCIAL_LINKS.linkedin)
    expect(screen.getByText('GitHub').getAttribute('href')).toBe(SOCIAL_LINKS.github)
  })

  it('takes the static loader down, since the app that would lift it never runs', () => {
    document.body.insertAdjacentHTML('afterbegin', '<div id="boot"></div>')
    render(<PhoneNotice />)
    expect(document.getElementById('boot')).toBeNull()
  })
})
