import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement, Fragment } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../src/context/AuthContext';
import type { User } from '../src/api/authApi';
import { getLandingAccountView } from '../src/pages/LandingPage/components/landingAccountView';
import Navbar from '../src/pages/LandingPage/components/Navbar';
import Hero from '../src/pages/LandingPage/components/Hero';
import Pricing from '../src/pages/LandingPage/components/Pricing';

const instructor: User = {
  id: 'instructor-1', role: 'Instructor', name: 'مریم رضایی',
  username: 'maryam', onboardingCompleted: true, avatarUrl: '/images/profile.jpg',
};

function renderLanding(user: User | null, isSessionReady = true, isSessionUnavailable = false) {
  const auth: AuthContextValue = {
    user, isSessionReady, isAuthenticated: !!user,
    isSessionUnavailable, retrySession: () => {}, logout: () => {},
  };
  return renderToString(
    createElement(MemoryRouter, {},
      createElement(AuthContext.Provider, { value: auth },
        createElement(Fragment, {},
          createElement(Navbar),
          createElement(Hero),
          createElement(Pricing),
        ),
      ),
    ),
  );
}

test('authenticated user sees glass profile and panel action instead of guest login/signup', () => {
  const html = renderLanding(instructor);
  assert.match(html, /مریم رضایی/);
  assert.match(html, /profile\.jpg/);
  assert.match(html, /منوی حساب کاربری/);
  assert.match(html, /ورود به میزکار/);
  assert.doesNotMatch(html, /ثبت‌نام رایگان/);
  assert.equal(html.includes('>شروع رایگان</button>'), false);
  assert.match(html, /مدیریت اشتراک/);
  assert.doesNotMatch(html, />ورود<\/button>/);
});

test('guest sees login, signup and free-start CTAs', () => {
  const html = renderLanding(null);
  assert.match(html, /ثبت‌نام رایگان/);
  assert.match(html, /شروع رایگان/);
  assert.doesNotMatch(html, /مدیریت اشتراک/);
  assert.equal(html.includes('>ورود</button>'), true);
  assert.doesNotMatch(html, /منوی حساب کاربری/);
});

test('opening the public site before login shows guest actions immediately without a spinner', () => {
  const html = renderLanding(null, false);
  assert.match(html, /ثبت‌نام رایگان/);
  assert.equal(html.includes('>ورود</button>'), true);
  assert.match(html, /شروع رایگان/);
  assert.doesNotMatch(html, /در حال بررسی حساب|اتصال حساب برقرار نیست|تلاش مجدد|animate-spin/);
});

test('session loading or unavailable never replaces guest actions with a loading or retry card', () => {
  for (const unavailable of [false, true]) {
    const html = renderLanding(null, false, unavailable);
    assert.match(html, /ثبت‌نام رایگان|شروع رایگان/);
    assert.doesNotMatch(html, /در حال بررسی حساب|اتصال حساب برقرار نیست|تلاش مجدد/);
    assert.doesNotMatch(html, /منوی حساب کاربری/);
  }
});

test('logging out swaps profile actions back to guest signup and login', () => {
  const signedIn = renderLanding(instructor, true);
  const afterLogout = renderLanding(null, true);
  assert.match(signedIn, /منوی حساب کاربری/);
  assert.doesNotMatch(afterLogout, /منوی حساب کاربری|مریم رضایی/);
  assert.match(afterLogout, /ثبت‌نام رایگان/);
  assert.match(afterLogout, /شروع رایگان/);
});

test('destination and display name match the signed-in role with safe fallbacks', () => {
  assert.deepEqual(getLandingAccountView({ user: instructor, isSessionReady: true }), {
    status: 'authenticated',
    user: instructor,
    displayName: 'مریم رضایی',
    roleName: 'مدرس',
    dashboardPath: '/workspace',
  });
  const student = { ...instructor, role: 'Student' as const, name: '  ', username: 'student7' };
  assert.equal(getLandingAccountView({ user: student, isSessionReady: true }).dashboardPath, '/dashboard');
  const admin = { ...instructor, role: 'SuperAdmin' as const, name: undefined, username: undefined };
  assert.equal(getLandingAccountView({ user: admin, isSessionReady: true }).displayName, 'کاربر');
  assert.equal(getLandingAccountView({ user: admin, isSessionReady: true }).dashboardPath, '/workspace');
  assert.equal(getLandingAccountView({ user: instructor, isSessionReady: false }).status, 'guest');
  assert.equal(getLandingAccountView({ user: null, isSessionReady: false }).status, 'guest');
  assert.equal(getLandingAccountView({ user: null, isSessionReady: false, isSessionUnavailable: true }).status, 'guest');
});
