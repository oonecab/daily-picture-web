; Re-rendered subset, not a new REA observation.
; Source: evidence/deep-cache/storage-json.json
; Evidence: ev_e559ec21919cdf6b212f0ca080a9bd67dc539290d48532d43846200b774840eb
; Target: d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a
0x1804b9190 53                   push rbx
0x1804b9191 56                   push rsi
0x1804b9192 57                   push rdi
0x1804b9193 4155                 push r13
0x1804b9195 4156                 push r14
0x1804b9197 4157                 push r15
0x1804b9199 4883ec28             sub rsp, 0x28
0x1804b919d 488bf2               mov rsi, rdx
0x1804b91a0 4c8be9               mov r13, rcx
0x1804b91a3 ff152f9bdeff         call qword [0x1802a2cd8]
0x1804b91a9 4885f6               test rsi, rsi
0x1804b91ac 0f8425030000         jz 0x1804b94d7
0x1804b91b2 488b7608             mov rsi, qword [rsi+0x08]
0x1804b91b6 4885f6               test rsi, rsi
0x1804b91b9 0f84bf020000         jz 0x1804b947e
0x1804b91bf 488d155a36dfff       lea rdx, qword [0x1802ac820]
0x1804b91c6 ff157cf2deff         call qword [sym.imp.mrt100_app.dll_RhpCheckCctor2]
0x1804b91cc 488d058df4deff       lea rax, qword [0x1802a8660]
0x1804b91d3 488bd8               mov rbx, rax
0x1804b91d6 4c8b7808             mov r15, qword [rax+0x08]
0x1804b91da 4d85ff               test r15, r15
0x1804b91dd 7527                 jnz 0x1804b9206
0x1804b91df 488d0d020dbcff       lea rcx, qword [0x180079ee8]
0x1804b91e6 ff1564f2deff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b91ec 4c8bf8               mov r15, rax
0x1804b91ef 4c8d051a030000       lea r8, qword [0x1804b9510]
0x1804b91f6 488b13               mov rdx, qword [rbx]
0x1804b91f9 488bc8               mov rcx, rax
0x1804b91fc ff150eafdeff         call qword [0x1802a4110]
0x1804b9202 4c897b08             mov qword [rbx+0x08], r15
0x1804b9206 488bce               mov rcx, rsi
0x1804b9209 488d157042baff       lea rdx, qword [0x18005d480]
0x1804b9210 ff150af3deff         call qword [sym.imp.mrt100_app.dll_RhTypeCast_IsInstanceOfClass]
0x1804b9216 488bce               mov rcx, rsi
0x1804b9219 4885c0               test rax, rax
0x1804b921c 0f84b2010000         jz 0x1804b93d4
0x1804b9222 488d156f49baff       lea rdx, qword [0x18005db98]
0x1804b9229 ff15f1f2deff         call qword [sym.imp.mrt100_app.dll_RhTypeCast_IsInstanceOfClass]
0x1804b922f 488bce               mov rcx, rsi
0x1804b9232 4885c0               test rax, rax
0x1804b9235 741f                 jz 0x1804b9256
0x1804b9237 488d155a49baff       lea rdx, qword [0x18005db98]
0x1804b923e ff15b4f2deff         call qword [sym.imp.mrt100_app.dll_RhTypeCast_CheckCastClass]
0x1804b9244 488bd8               mov rbx, rax
0x1804b9247 488d0d7a1cbbff       lea rcx, qword [0x18006aec8]
0x1804b924e ff15fcf1deff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b9254 eb66                 jmp 0x1804b92bc
0x1804b9256 488d151350baff       lea rdx, qword [0x18005e270]
0x1804b925d ff15bdf2deff         call qword [sym.imp.mrt100_app.dll_RhTypeCast_IsInstanceOfClass]
0x1804b9263 488bce               mov rcx, rsi
0x1804b9266 4885c0               test rax, rax
0x1804b9269 741f                 jz 0x1804b928a
0x1804b926b 488d15fe4fbaff       lea rdx, qword [0x18005e270]
0x1804b9272 ff1580f2deff         call qword [sym.imp.mrt100_app.dll_RhTypeCast_CheckCastClass]
0x1804b9278 488bd8               mov rbx, rax
0x1804b927b 488d0dd625bbff       lea rcx, qword [0x18006b858]
0x1804b9282 ff15c8f1deff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b9288 eb32                 jmp 0x1804b92bc
0x1804b928a 488d15df57baff       lea rdx, qword [0x18005ea70]
0x1804b9291 ff1589f2deff         call qword [sym.imp.mrt100_app.dll_RhTypeCast_IsInstanceOfClass]
0x1804b9297 4885c0               test rax, rax
0x1804b929a 7463                 jz 0x1804b92ff
0x1804b929c 488bce               mov rcx, rsi
0x1804b929f 488d15ca57baff       lea rdx, qword [0x18005ea70]
0x1804b92a6 ff154cf2deff         call qword [sym.imp.mrt100_app.dll_RhTypeCast_CheckCastClass]
0x1804b92ac 488bd8               mov rbx, rax
0x1804b92af 488d0d122ebbff       lea rcx, qword [0x18006c0c8]
0x1804b92b6 ff1594f1deff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b92bc 488bf0               mov rsi, rax
0x1804b92bf 488b7b20             mov rdi, qword [rbx+0x20]
0x1804b92c3 488b5b18             mov rbx, qword [rbx+0x18]
0x1804b92c7 488bc8               mov rcx, rax
0x1804b92ca ff15089adeff         call qword [0x1802a2cd8]
0x1804b92d0 ff159294deff         call qword [0x1802a2768]
0x1804b92d6 894608               mov dword [rsi+0x08], eax
0x1804b92d9 488d4e18             lea rcx, qword [rsi+0x18]
0x1804b92dd 488bd3               mov rdx, rbx
0x1804b92e0 ff157af1deff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b92e6 488d4e20             lea rcx, qword [rsi+0x20]
0x1804b92ea 488bd7               mov rdx, rdi
0x1804b92ed ff156df1deff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b92f3 488d4e28             lea rcx, qword [rsi+0x28]
0x1804b92f7 4c8bf6               mov r14, rsi
0x1804b92fa e958010000           jmp 0x1804b9457
0x1804b92ff 488b15b84dc6ff       mov rdx, qword [0x18011e0be]
0x1804b9306 4883c2f0             add rdx, 0xfffffffffffffff0
0x1804b930a ff1538f1deff         call qword [sym.imp.mrt100_app.dll_RhpCheckCctor2]
0x1804b9310 488b058f4dc6ff       mov rax, qword [0x18011e0a6]
0x1804b9317 488bd8               mov rbx, rax
0x1804b931a 4c8b7008             mov r14, qword [rax+0x08]
0x1804b931e 4d85f6               test r14, r14
0x1804b9321 7527                 jnz 0x1804b934a
0x1804b9323 488d0d4e0cbcff       lea rcx, qword [0x180079f78]
0x1804b932a ff1520f1deff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b9330 4c8bf0               mov r14, rax
0x1804b9333 4c8b05de7cdeff       mov r8, qword [0x1802a1018]
0x1804b933a 488b13               mov rdx, qword [rbx]
0x1804b933d 488bc8               mov rcx, rax
0x1804b9340 ff15caaddeff         call qword [0x1802a4110]
0x1804b9346 4c897308             mov qword [rbx+0x08], r14
0x1804b934a 488d0d4748baff       lea rcx, qword [0x18005db98]
0x1804b9351 ff15f9f0deff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b9357 488bd8               mov rbx, rax
0x1804b935a 488bc8               mov rcx, rax
0x1804b935d ff157599deff         call qword [0x1802a2cd8]
0x1804b9363 ff15ff93deff         call qword [0x1802a2768]
0x1804b9369 894308               mov dword [rbx+0x08], eax
0x1804b936c 488d4b18             lea rcx, qword [rbx+0x18]
0x1804b9370 488bd6               mov rdx, rsi
0x1804b9373 ff15e7f0deff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b9379 488d4b20             lea rcx, qword [rbx+0x20]
0x1804b937d 498bd6               mov rdx, r14
0x1804b9380 ff15daf0deff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b9386 488d0d3b1bbbff       lea rcx, qword [0x18006aec8]
0x1804b938d ff15bdf0deff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b9393 4c8bf0               mov r14, rax
0x1804b9396 488b7320             mov rsi, qword [rbx+0x20]
0x1804b939a 488b5b18             mov rbx, qword [rbx+0x18]
0x1804b939e 488bc8               mov rcx, rax
0x1804b93a1 ff153199deff         call qword [0x1802a2cd8]
0x1804b93a7 ff15bb93deff         call qword [0x1802a2768]
0x1804b93ad 41894608             mov dword [r14+0x08], eax
0x1804b93b1 498d4e18             lea rcx, qword [r14+0x18]
0x1804b93b5 488bd3               mov rdx, rbx
0x1804b93b8 ff15a2f0deff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b93be 498d4e20             lea rcx, qword [r14+0x20]
0x1804b93c2 488bd6               mov rdx, rsi
0x1804b93c5 ff1595f0deff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b93cb 498d4e28             lea rcx, qword [r14+0x28]
0x1804b93cf e983000000           jmp 0x1804b9457
0x1804b93d4 488d153d2ac4ff       lea rdx, qword [0x1800fbe18]
0x1804b93db ff1527f1deff         call qword [sym.imp.mrt100_app.dll_RhTypeCast_IsInstanceOfArray]
0x1804b93e1 4885c0               test rax, rax
0x1804b93e4 740f                 jz 0x1804b93f5
0x1804b93e6 488d0d6b24bbff       lea rcx, qword [0x18006b858]
0x1804b93ed ff155df0deff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b93f3 eb31                 jmp 0x1804b9426
0x1804b93f5 488bce               mov rcx, rsi
0x1804b93f8 488d15613fbbff       lea rdx, qword [0x18006d360]
0x1804b93ff ff151bf1deff         call qword [sym.imp.mrt100_app.dll_RhTypeCast_IsInstanceOfClass]
0x1804b9405 4885c0               test rax, rax
0x1804b9408 740f                 jz 0x1804b9419
0x1804b940a 488d0db72cbbff       lea rcx, qword [0x18006c0c8]
0x1804b9411 ff1539f0deff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b9417 eb0d                 jmp 0x1804b9426
0x1804b9419 488d0da81abbff       lea rcx, qword [0x18006aec8]
0x1804b9420 ff152af0deff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b9426 488bd8               mov rbx, rax
0x1804b9429 488bc8               mov rcx, rax
0x1804b942c ff15a698deff         call qword [0x1802a2cd8]
0x1804b9432 ff153093deff         call qword [0x1802a2768]
0x1804b9438 488d4b18             lea rcx, qword [rbx+0x18]
0x1804b943c 488bd6               mov rdx, rsi
0x1804b943f ff151bf0deff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b9445 894308               mov dword [rbx+0x08], eax
0x1804b9448 48c7432000000000     mov qword [rbx+0x20], 0x00
0x1804b9450 488d4b28             lea rcx, qword [rbx+0x28]
0x1804b9454 4c8bf3               mov r14, rbx
0x1804b9457 498bd7               mov rdx, r15
0x1804b945a ff1500f0deff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b9460 488d0d4136bbff       lea rcx, qword [0x18006caa8]
0x1804b9467 ff15e3efdeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b946d 488bd8               mov rbx, rax
0x1804b9470 498bd6               mov rdx, r14
0x1804b9473 488bc8               mov rcx, rax
0x1804b9476 ff159470deff         call qword [0x1802a0510]
0x1804b947c eb3e                 jmp 0x1804b94bc
0x1804b947e 488d0d2336bbff       lea rcx, qword [0x18006caa8]
0x1804b9485 ff15c5efdeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b948b 488bd8               mov rbx, rax
0x1804b948e 488bc8               mov rcx, rax
0x1804b9491 ff154198deff         call qword [0x1802a2cd8]
0x1804b9497 488b15b53cc6ff       mov rdx, qword [0x18011d153]
0x1804b949e 4883c2f0             add rdx, 0xfffffffffffffff0
0x1804b94a2 ff15a0efdeff         call qword [sym.imp.mrt100_app.dll_RhpCheckCctor2]
0x1804b94a8 488b058c3cc6ff       mov rax, qword [0x18011d13b]
0x1804b94af 488d4b08             lea rcx, qword [rbx+0x08]
0x1804b94b3 488b10               mov rdx, qword [rax]
0x1804b94b6 ff15a4efdeff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b94bc 498d4d08             lea rcx, qword [r13+0x08]
0x1804b94c0 488bd3               mov rdx, rbx
0x1804b94c3 ff1597efdeff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b94c9 4883c428             add rsp, 0x28
0x1804b94cd 415f                 pop r15
0x1804b94cf 415e                 pop r14
0x1804b94d1 415d                 pop r13
0x1804b94d3 5f                   pop rdi
0x1804b94d4 5e                   pop rsi
0x1804b94d5 5b                   pop rbx
0x1804b94d6 c3                   ret
0x1804b94d7 488b0d22cedeff       mov rcx, qword [0x1802a6300]
0x1804b94de ff156cefdeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b94e4 488bd8               mov rbx, rax
0x1804b94e7 488d1582cddfff       lea rdx, qword [0x1802b6270]
0x1804b94ee 488bc8               mov rcx, rax
0x1804b94f1 ff151982deff         call qword [0x1802a1710]
0x1804b94f7 488bcb               mov rcx, rbx
0x1804b94fa ff15c8efdeff         call qword [sym.imp.mrt100_app.dll_RhpThrowEx]
0x1804b9500 cc                   int3
0x1804b9501 cc                   int3
0x1804b9502 cc                   int3
0x1804b9503 cc                   int3
0x1804b9504 cc                   int3
0x1804b9505 cc                   int3
0x1804b9506 cc                   int3
0x1804b9507 cc                   int3
0x1804b9508 cc                   int3
0x1804b9509 cc                   int3
0x1804b950a cc                   int3
0x1804b950b cc                   int3
0x1804b950c cc                   int3
0x1804b950d cc                   int3
0x1804b950e cc                   int3
0x1804b950f cc                   int3
0x1804b9510 53                   push rbx
0x1804b9511 56                   push rsi
0x1804b9512 57                   push rdi
0x1804b9513 4883ec20             sub rsp, 0x20
0x1804b9517 488b5a08             mov rbx, qword [rdx+0x08]
0x1804b951b 488b7a10             mov rdi, qword [rdx+0x10]
0x1804b951f 488d0d32b8b4ff       lea rcx, qword [0x180004d58]
0x1804b9526 ff1524efdeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b952c 488bf0               mov rsi, rax
0x1804b952f 488bc8               mov rcx, rax
0x1804b9532 ff15a097deff         call qword [0x1802a2cd8]
0x1804b9538 488d4e08             lea rcx, qword [rsi+0x08]
0x1804b953c 488bd3               mov rdx, rbx
0x1804b953f ff151befdeff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b9545 488d4e10             lea rcx, qword [rsi+0x10]
0x1804b9549 488bd7               mov rdx, rdi
0x1804b954c ff150eefdeff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b9552 488b4e08             mov rcx, qword [rsi+0x08]
0x1804b9556 e8056bfeff           call 0x1804a0060
0x1804b955b 488d4e18             lea rcx, qword [rsi+0x18]
0x1804b955f 488bd0               mov rdx, rax
0x1804b9562 ff15f8eedeff         call qword [sym.imp.mrt100_app.dll_RhpAssignRefEDX]
0x1804b9568 488bc6               mov rax, rsi
0x1804b956b 4883c420             add rsp, 0x20
0x1804b956f 5f                   pop rdi
0x1804b9570 5e                   pop rsi
0x1804b9571 5b                   pop rbx
0x1804b9572 c3                   ret
