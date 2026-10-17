; Re-rendered subset, not a new REA observation.
; Source: evidence/deep-cache/extra-cache.json
; Evidence: ev_6da75649a5d884360afb0fedf9861d1ad2efaaf237aed1981b2a4a37d3c18b7c
; Target: d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a
0x1804bf900 55                   push rbp
0x1804bf901 53                   push rbx
0x1804bf902 56                   push rsi
0x1804bf903 57                   push rdi
0x1804bf904 4883ec58             sub rsp, 0x58
0x1804bf908 488d6c2420           lea rbp, qword [rsp+0x20]
0x1804bf90d 48894d60             mov qword [rbp+0x60], rcx
0x1804bf911 488bf9               mov rdi, rcx
0x1804bf914 33f6                 xor esi, esi
0x1804bf916 48897500             mov qword [rbp], rsi
0x1804bf91a 48897508             mov qword [rbp+0x08], rsi
0x1804bf91e 48897520             mov qword [rbp+0x20], rsi
0x1804bf922 48897528             mov qword [rbp+0x28], rsi
0x1804bf926 8b01                 mov eax, dword [rcx]
0x1804bf928 48897510             mov qword [rbp+0x10], rsi
0x1804bf92c 48897518             mov qword [rbp+0x18], rsi
0x1804bf930 85c0                 test eax, eax
0x1804bf932 0f841c010000         jz 0x1804bfa54
0x1804bf938 83f801               cmp eax, 0x01
0x1804bf93b 0f84fc000000         jz 0x1804bfa3d
0x1804bf941 488b4918             mov rcx, qword [rcx+0x18]
0x1804bf945 ff15e534deff         call qword [0x1802a2e30]
0x1804bf94b 84c0                 test al, al
0x1804bf94d 7429                 jz 0x1804bf978
0x1804bf94f 488b0daa69deff       mov rcx, qword [0x1802a6300]
0x1804bf956 ff15f48adeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804bf95c 488bd8               mov rbx, rax
0x1804bf95f 488d15223de0ff       lea rdx, qword [0x1802c3688]
0x1804bf966 488bc8               mov rcx, rax
0x1804bf969 ff15a11ddeff         call qword [0x1802a1710]
0x1804bf96f 488bcb               mov rcx, rbx
0x1804bf972 ff15508bdeff         call qword [sym.imp.mrt100_app.dll_RhpThrowEx]
0x1804bf978 488d1531d2b4ff       lea rdx, qword [0x18000cbb0]
0x1804bf97f 488d0d4a60e0ff       lea rcx, qword [0x1802c59d0]
0x1804bf986 ff151c1fdeff         call qword [0x1802a18a8]
0x1804bf98c 488d0df5fac4ff       lea rcx, qword [0x18010f488]
0x1804bf993 41b806000000         mov r8d, 0x06
0x1804bf999 488bd0               mov rdx, rax
0x1804bf99c e8ef2bf4ff           call 0x180402590
0x1804bf9a1 803800               cmp byte [rax], 0x00
0x1804bf9a4 488d0df5fac4ff       lea rcx, qword [0x18010f4a0]
0x1804bf9ab 41b80c000000         mov r8d, 0x0c
0x1804bf9b1 488bd0               mov rdx, rax
0x1804bf9b4 e8d72bf4ff           call 0x180402590
0x1804bf9b9 803800               cmp byte [rax], 0x00
0x1804bf9bc 488d0d0dfcc4ff       lea rcx, qword [0x18010f5d0]
0x1804bf9c3 41b90b000000         mov r9d, 0x0b
0x1804bf9c9 4c8d053867e0ff       lea r8, qword [0x1802c6108]
0x1804bf9d0 488bd0               mov rdx, rax
0x1804bf9d3 e8485cfbff           call 0x180475620
0x1804bf9d8 488bd8               mov rbx, rax
0x1804bf9db ff156f09deff         call qword [0x1802a0350]
0x1804bf9e1 488d0de8fac4ff       lea rcx, qword [0x18010f4d0]
0x1804bf9e8 4c8bc0               mov r8, rax
0x1804bf9eb 488bd3               mov rdx, rbx
0x1804bf9ee e87de4fbff           call 0x18047de70
0x1804bf9f3 803800               cmp byte [rax], 0x00
0x1804bf9f6 48897520             mov qword [rbp+0x20], rsi
0x1804bf9fa 48894500             mov qword [rbp], rax
0x1804bf9fe 488bc8               mov rcx, rax
0x1804bfa01 ff158118deff         call qword [0x1802a1288]
0x1804bfa07 84c0                 test al, al
0x1804bfa09 752c                 jnz 0x1804bfa37
0x1804bfa0b 8937                 mov dword [rdi], esi
0x1804bfa0d 488d4f20             lea rcx, qword [rdi+0x20]
0x1804bfa11 488b5500             mov rdx, qword [rbp]
0x1804bfa15 ff156d8adeff         call qword [sym.imp.mrt100_app.dll_RhpCheckedAssignRefEDX]
0x1804bfa1b 488d15c600c5ff       lea rdx, qword [0x18010fae8]
0x1804bfa22 488d4f08             lea rcx, qword [rdi+0x08]
0x1804bfa26 4c8bcf               mov r9, rdi
0x1804bfa29 4c8d4500             lea r8, qword [rbp]
0x1804bfa2d e89ebefbff           call 0x18047b8d0
0x1804bfa32 e9f6000000           jmp 0x1804bfb2d
0x1804bfa37 488b4d00             mov rcx, qword [rbp]
0x1804bfa3b eb29                 jmp 0x1804bfa66
0x1804bfa3d 488b4928             mov rcx, qword [rcx+0x28]
0x1804bfa41 48894d08             mov qword [rbp+0x08], rcx
0x1804bfa45 48897728             mov qword [rdi+0x28], rsi
0x1804bfa49 c707ffffffff         mov dword [rdi], 0xffffffff
0x1804bfa4f e9a8000000           jmp 0x1804bfafc
0x1804bfa54 488b4920             mov rcx, qword [rcx+0x20]
0x1804bfa58 48894d00             mov qword [rbp], rcx
0x1804bfa5c 48897720             mov qword [rdi+0x20], rsi
0x1804bfa60 c707ffffffff         mov dword [rdi], 0xffffffff
0x1804bfa66 ff154400deff         call qword [0x18029fab0]
0x1804bfa6c 488b4500             mov rax, qword [rbp]
0x1804bfa70 488b5848             mov rbx, qword [rax+0x48]
0x1804bfa74 488b4f18             mov rcx, qword [rdi+0x18]
0x1804bfa78 e8e305feff           call 0x1804a0060
0x1804bfa7d 803b00               cmp byte [rbx], 0x00
0x1804bfa80 488d0dd9fbc4ff       lea rcx, qword [0x18010f660]
0x1804bfa87 41b90a000000         mov r9d, 0x0a
0x1804bfa8d 4c8bc0               mov r8, rax
0x1804bfa90 488bd3               mov rdx, rbx
0x1804bfa93 e8885bfbff           call 0x180475620
0x1804bfa98 488bd8               mov rbx, rax
0x1804bfa9b ff15af08deff         call qword [0x1802a0350]
0x1804bfaa1 488d0d68f7c4ff       lea rcx, qword [0x18010f210]
0x1804bfaa8 4c8bc0               mov r8, rax
0x1804bfaab 488bd3               mov rdx, rbx
0x1804bfaae e8bde3fbff           call 0x18047de70
0x1804bfab3 803800               cmp byte [rax], 0x00
0x1804bfab6 48897528             mov qword [rbp+0x28], rsi
0x1804bfaba 48894508             mov qword [rbp+0x08], rax
0x1804bfabe 488bc8               mov rcx, rax
0x1804bfac1 ff15c117deff         call qword [0x1802a1288]
0x1804bfac7 84c0                 test al, al
0x1804bfac9 752d                 jnz 0x1804bfaf8
0x1804bfacb c70701000000         mov dword [rdi], 0x01
0x1804bfad1 488d4f28             lea rcx, qword [rdi+0x28]
0x1804bfad5 488b5508             mov rdx, qword [rbp+0x08]
0x1804bfad9 ff15a989deff         call qword [sym.imp.mrt100_app.dll_RhpCheckedAssignRefEDX]
0x1804bfadf 488d1572d4c4ff       lea rdx, qword [0x18010cf58]
0x1804bfae6 488d4f08             lea rcx, qword [rdi+0x08]
0x1804bfaea 4c8bcf               mov r9, rdi
0x1804bfaed 4c8d4508             lea r8, qword [rbp+0x08]
0x1804bfaf1 e8dabdfbff           call 0x18047b8d0
0x1804bfaf6 eb35                 jmp 0x1804bfb2d
0x1804bfaf8 488b4d08             mov rcx, qword [rbp+0x08]
0x1804bfafc ff15aeffddff         call qword [0x18029fab0]
0x1804bfb02 488b4508             mov rax, qword [rbp+0x08]
0x1804bfb06 488b4848             mov rcx, qword [rax+0x48]
0x1804bfb0a 48894d10             mov qword [rbp+0x10], rcx
0x1804bfb0e 488b4d60             mov rcx, qword [rbp+0x60]
0x1804bfb12 c701feffffff         mov dword [rcx], 0xfffffffe
0x1804bfb18 488d15e1c5b8ff       lea rdx, qword [0x18004c100]
0x1804bfb1f 4883c108             add rcx, 0x08
0x1804bfb23 4c8b4510             mov r8, qword [rbp+0x10]
0x1804bfb27 ff154bf9ddff         call qword [0x18029f478]
0x1804bfb2d 90                   nop
0x1804bfb2e 488d6538             lea rsp, qword [rbp+0x38]
0x1804bfb32 5f                   pop rdi
0x1804bfb33 5e                   pop rsi
0x1804bfb34 5b                   pop rbx
0x1804bfb35 5d                   pop rbp
0x1804bfb36 c3                   ret
0x1804bfb37 4883ec28             sub rsp, 0x28
0x1804bfb3b 4c8bc1               mov r8, rcx
0x1804bfb3e 48894d18             mov qword [rbp+0x18], rcx
0x1804bfb42 488b4d60             mov rcx, qword [rbp+0x60]
0x1804bfb46 c701feffffff         mov dword [rcx], 0xfffffffe
0x1804bfb4c 488d15adc5b8ff       lea rdx, qword [0x18004c100]
0x1804bfb53 4883c108             add rcx, 0x08
0x1804bfb57 ff1523f9ddff         call qword [0x18029f480]
0x1804bfb5d 488d05c9ffffff       lea rax, qword [0x1804bfb2d]
0x1804bfb64 4883c428             add rsp, 0x28
0x1804bfb68 c3                   ret
0x1804bfb69 cc                   int3
0x1804bfb6a cc                   int3
0x1804bfb6b cc                   int3
0x1804bfb6c cc                   int3
0x1804bfb6d cc                   int3
0x1804bfb6e cc                   int3
0x1804bfb6f cc                   int3
