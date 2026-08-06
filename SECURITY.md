# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 3.x     | ✅ |
| 2.x     | ❌ |
| 1.x     | ❌ |

Fixes land on the latest 3.x release. Older majors are not patched.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through
[GitHub Security Advisories](https://github.com/kesha-antonov/react-native-action-cable/security/advisories/new),
which lets us discuss and fix the issue before it is disclosed. If that is not
an option for you, email <innokenty.longway@gmail.com>.

Useful things to include: the affected version, what an attacker can do, and a
reproduction if you have one.

This project is maintained in free time, so please allow a few days for a first
response. You will get an acknowledgement, an assessment, and credit in the
advisory unless you would rather stay anonymous.

## Scope

This library is a WebSocket client for Rails ActionCable. It has one runtime
dependency (`eventemitter3`), ships no native code, and does no crypto of its
own - transport security comes from using a `wss://` url and from your Rails
server's authentication.

In scope: anything in this package that lets an attacker read or inject channel
messages, escalate a connection, leak credentials from headers, or crash a
consuming app.

Out of scope: vulnerabilities in Rails or ActionCable itself (report those to
[Rails](https://rubyonrails.org/security)), and applications that send
credentials over an unencrypted `ws://` connection, which is a configuration
issue rather than a flaw in this library.
