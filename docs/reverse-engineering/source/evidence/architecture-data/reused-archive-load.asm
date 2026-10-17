; Re-rendered subset, not a new REA observation.
; Source: evidence/deep-cache/storage-json.json
; Evidence: ev_e559ec21919cdf6b212f0ca080a9bd67dc539290d48532d43846200b774840eb
; Target: d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a
0x1804b96b0 55                   push rbp
0x1804b96b1 53                   push rbx
0x1804b96b2 56                   push rsi
0x1804b96b3 57                   push rdi
0x1804b96b4 4156                 push r14
0x1804b96b6 4157                 push r15
0x1804b96b8 4881ec88000000       sub rsp, 0x88
0x1804b96bf 488d6c2420           lea rbp, qword [rsp+0x20]
0x1804b96c4 48898da0000000       mov qword [rbp+0xa0], rcx
0x1804b96cb 488bf9               mov rdi, rcx
0x1804b96ce 4533ff               xor r15d, r15d
0x1804b96d1 4c897d08             mov qword [rbp+0x08], r15
0x1804b96d5 4c897d10             mov qword [rbp+0x10], r15
0x1804b96d9 4c897d18             mov qword [rbp+0x18], r15
0x1804b96dd 4c897d48             mov qword [rbp+0x48], r15
0x1804b96e1 4c897d50             mov qword [rbp+0x50], r15
0x1804b96e5 4c897d58             mov qword [rbp+0x58], r15
0x1804b96e9 486301               movsxd rax, dword [rcx]
0x1804b96ec 894500               mov dword [rbp], eax
0x1804b96ef 4c897d20             mov qword [rbp+0x20], r15
0x1804b96f3 4c897d40             mov qword [rbp+0x40], r15
0x1804b96f7 90                   nop
0x1804b96f8 83f803               cmp eax, 0x03
0x1804b96fb 736f                 jnb 0x1804b976c
0x1804b96fd 488bc8               mov rcx, rax
0x1804b9700 488d05d1b0c8ff       lea rax, qword [0x1801447d8]
0x1804b9707 48630c88             movsxd rcx, dword [rax+rcx*4]
0x1804b970b 4803c8               add rcx, rax
0x1804b970e ffe1                 jmp rcx
0x1804b9710 ebfe                 jmp 0x1804b9710
0x1804b9712 488b4f20             mov rcx, qword [rdi+0x20]
0x1804b9716 48894d08             mov qword [rbp+0x08], rcx
0x1804b971a 4c897f20             mov qword [rdi+0x20], r15
0x1804b971e c74500ffffffff       mov dword [rbp], 0xffffffff
0x1804b9725 c707ffffffff         mov dword [rdi], 0xffffffff
0x1804b972b e907010000           jmp 0x1804b9837
0x1804b9730 488b4f28             mov rcx, qword [rdi+0x28]
0x1804b9734 48894d10             mov qword [rbp+0x10], rcx
0x1804b9738 4c897f28             mov qword [rdi+0x28], r15
0x1804b973c c74500ffffffff       mov dword [rbp], 0xffffffff
0x1804b9743 c707ffffffff         mov dword [rdi], 0xffffffff
0x1804b9749 e9e0010000           jmp 0x1804b992e
0x1804b974e 488b4f30             mov rcx, qword [rdi+0x30]
0x1804b9752 48894d18             mov qword [rbp+0x18], rcx
0x1804b9756 4c897f30             mov qword [rdi+0x30], r15
0x1804b975a c74500ffffffff       mov dword [rbp], 0xffffffff
0x1804b9761 c707ffffffff         mov dword [rdi], 0xffffffff
0x1804b9767 e921020000           jmp 0x1804b998d
0x1804b976c 488d153d34b5ff       lea rdx, qword [0x18000cbb0]
0x1804b9773 488d0d56c2e0ff       lea rcx, qword [0x1802c59d0]
0x1804b977a ff152881deff         call qword [0x1802a18a8]
0x1804b9780 488d0d015dc5ff       lea rcx, qword [0x18010f488]
0x1804b9787 41b806000000         mov r8d, 0x06
0x1804b978d 488bd0               mov rdx, rax
0x1804b9790 e8fb8df4ff           call 0x180402590
0x1804b9795 803800               cmp byte [rax], 0x00
0x1804b9798 488d0d015dc5ff       lea rcx, qword [0x18010f4a0]
0x1804b979f 41b80c000000         mov r8d, 0x0c
0x1804b97a5 488bd0               mov rdx, rax
0x1804b97a8 e8e38df4ff           call 0x180402590
0x1804b97ad 488bd0               mov rdx, rax
0x1804b97b0 488d4f18             lea rcx, qword [rdi+0x18]
0x1804b97b4 ff15ceecdeff         call qword [sym.imp.mrt100_app.dll_RhpCheckedAssignRefEDX]
0x1804b97ba 488b5718             mov rdx, qword [rdi+0x18]
0x1804b97be 803a00               cmp byte [rdx], 0x00
0x1804b97c1 488d0da85cc5ff       lea rcx, qword [0x18010f470]
0x1804b97c8 41b80d000000         mov r8d, 0x0d
0x1804b97ce e8bd8df4ff           call 0x180402590
0x1804b97d3 488bd8               mov rbx, rax
0x1804b97d6 ff15746bdeff         call qword [0x1802a0350]
0x1804b97dc 488d0df532c5ff       lea rcx, qword [0x18010cad8]
0x1804b97e3 4c8bc0               mov r8, rax
0x1804b97e6 488bd3               mov rdx, rbx
0x1804b97e9 e88246fcff           call 0x18047de70
0x1804b97ee 803800               cmp byte [rax], 0x00
0x1804b97f1 4c897d48             mov qword [rbp+0x48], r15
0x1804b97f5 48894508             mov qword [rbp+0x08], rax
0x1804b97f9 488bc8               mov rcx, rax
0x1804b97fc ff15867adeff         call qword [0x1802a1288]
0x1804b9802 84c0                 test al, al
0x1804b9804 752d                 jnz 0x1804b9833
0x1804b9806 44893f               mov dword [rdi], r15d
0x1804b9809 488d4f20             lea rcx, qword [rdi+0x20]
0x1804b980d 488b5508             mov rdx, qword [rbp+0x08]
0x1804b9811 ff1571ecdeff         call qword [sym.imp.mrt100_app.dll_RhpCheckedAssignRefEDX]
0x1804b9817 488d151a5ec5ff       lea rdx, qword [0x18010f638]
0x1804b981e 488d4f08             lea rcx, qword [rdi+0x08]
0x1804b9822 4c8bcf               mov r9, rdi
0x1804b9825 4c8d4508             lea r8, qword [rbp+0x08]
0x1804b9829 e8b221fcff           call 0x18047b9e0
0x1804b982e e929020000           jmp 0x1804b9a5c
0x1804b9833 488b4d08             mov rcx, qword [rbp+0x08]
0x1804b9837 ff157362deff         call qword [0x18029fab0]
0x1804b983d 488b4508             mov rax, qword [rbp+0x08]
0x1804b9841 4c8b7048             mov r14, qword [rax+0x48]
0x1804b9845 488d15f42fdfff       lea rdx, qword [0x1802ac840]
0x1804b984c ff15f6ebdeff         call qword [sym.imp.mrt100_app.dll_RhpCheckCctor2]
0x1804b9852 488d051feedeff       lea rax, qword [0x1802a8678]
0x1804b9859 488bf0               mov rsi, rax
0x1804b985c 488b5808             mov rbx, qword [rax+0x08]
0x1804b9860 4885db               test rbx, rbx
0x1804b9863 7527                 jnz 0x1804b988c
0x1804b9865 488d0dac25bcff       lea rcx, qword [0x18007be18]
0x1804b986c ff15deebdeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b9872 488bd8               mov rbx, rax
0x1804b9875 4c8d05a469feff       lea r8, qword [0x1804a0220]
0x1804b987c 488b16               mov rdx, qword [rsi]
0x1804b987f 488bc8               mov rcx, rax
0x1804b9882 ff1588a8deff         call qword [0x1802a4110]
0x1804b9888 48895e08             mov qword [rsi+0x08], rbx
0x1804b988c 488d0d755dc5ff       lea rcx, qword [0x18010f608]
0x1804b9893 4c8bc3               mov r8, rbx
0x1804b9896 498bd6               mov rdx, r14
0x1804b9899 e832c8f1ff           call 0x1803d60d0
0x1804b989e 84c0                 test al, al
0x1804b98a0 7505                 jnz 0x1804b98a7
0x1804b98a2 e993010000           jmp 0x1804b9a3a
0x1804b98a7 488b5718             mov rdx, qword [rdi+0x18]
0x1804b98ab 803a00               cmp byte [rdx], 0x00
0x1804b98ae 488d0dab5dc5ff       lea rcx, qword [0x18010f660]
0x1804b98b5 41b90a000000         mov r9d, 0x0a
0x1804b98bb 4c8d05069ee0ff       lea r8, qword [0x1802c36c8]
0x1804b98c2 e859bdfbff           call 0x180475620
0x1804b98c7 488bd8               mov rbx, rax
0x1804b98ca ff15806adeff         call qword [0x1802a0350]
0x1804b98d0 488d0d3959c5ff       lea rcx, qword [0x18010f210]
0x1804b98d7 4c8bc0               mov r8, rax
0x1804b98da 488bd3               mov rdx, rbx
0x1804b98dd e88e45fcff           call 0x18047de70
0x1804b98e2 803800               cmp byte [rax], 0x00
0x1804b98e5 4c897d50             mov qword [rbp+0x50], r15
0x1804b98e9 48894510             mov qword [rbp+0x10], rax
0x1804b98ed 488bc8               mov rcx, rax
0x1804b98f0 ff159279deff         call qword [0x1802a1288]
0x1804b98f6 84c0                 test al, al
0x1804b98f8 7530                 jnz 0x1804b992a
0x1804b98fa c70701000000         mov dword [rdi], 0x01
0x1804b9900 488d4f28             lea rcx, qword [rdi+0x28]
0x1804b9904 488b5510             mov rdx, qword [rbp+0x10]
0x1804b9908 ff157aebdeff         call qword [sym.imp.mrt100_app.dll_RhpCheckedAssignRefEDX]
0x1804b990e 488d15635dc5ff       lea rdx, qword [0x18010f678]
0x1804b9915 488d4f08             lea rcx, qword [rdi+0x08]
0x1804b9919 4c8bcf               mov r9, rdi
0x1804b991c 4c8d4510             lea r8, qword [rbp+0x10]
0x1804b9920 e8bb20fcff           call 0x18047b9e0
0x1804b9925 e932010000           jmp 0x1804b9a5c
0x1804b992a 488b4d10             mov rcx, qword [rbp+0x10]
0x1804b992e ff157c61deff         call qword [0x18029fab0]
0x1804b9934 488b4510             mov rax, qword [rbp+0x10]
0x1804b9938 488b4848             mov rcx, qword [rax+0x48]
0x1804b993c e8bf010000           call 0x1804b9b00
0x1804b9941 803800               cmp byte [rax], 0x00
0x1804b9944 4c897d58             mov qword [rbp+0x58], r15
0x1804b9948 48894518             mov qword [rbp+0x18], rax
0x1804b994c 488bc8               mov rcx, rax
0x1804b994f ff153379deff         call qword [0x1802a1288]
0x1804b9955 84c0                 test al, al
0x1804b9957 7530                 jnz 0x1804b9989
0x1804b9959 c70702000000         mov dword [rdi], 0x02
0x1804b995f 488d4f30             lea rcx, qword [rdi+0x30]
0x1804b9963 488b5518             mov rdx, qword [rbp+0x18]
0x1804b9967 ff151bebdeff         call qword [sym.imp.mrt100_app.dll_RhpCheckedAssignRefEDX]
0x1804b996d 488d15bc35c5ff       lea rdx, qword [0x18010cf30]
0x1804b9974 488d4f08             lea rcx, qword [rdi+0x08]
0x1804b9978 4c8bcf               mov r9, rdi
0x1804b997b 4c8d4518             lea r8, qword [rbp+0x18]
0x1804b997f e85c20fcff           call 0x18047b9e0
0x1804b9984 e9d3000000           jmp 0x1804b9a5c
0x1804b9989 488b4d18             mov rcx, qword [rbp+0x18]
0x1804b998d ff151d61deff         call qword [0x18029fab0]
0x1804b9993 488b4518             mov rax, qword [rbp+0x18]
0x1804b9997 488b7848             mov rdi, qword [rax+0x48]
0x1804b999b 48897d28             mov qword [rbp+0x28], rdi
0x1804b999f 90                   nop
0x1804b99a0 488b0db1b8deff       mov rcx, qword [0x1802a5258]
0x1804b99a7 ff15a3eadeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b99ad 488bd8               mov rbx, rax
0x1804b99b0 488bd7               mov rdx, rdi
0x1804b99b3 488bc8               mov rcx, rax
0x1804b99b6 ff15ac5adeff         call qword [0x18029f468]
0x1804b99bc 48895d38             mov qword [rbp+0x38], rbx
0x1804b99c0 90                   nop
0x1804b99c1 488d0d080eb8ff       lea rcx, qword [0x18003a7d0]
0x1804b99c8 ff1582eadeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b99ce 488bf8               mov rdi, rax
0x1804b99d1 488bd3               mov rdx, rbx
0x1804b99d4 488bc8               mov rcx, rax
0x1804b99d7 e8645efeff           call 0x18049f840
0x1804b99dc 48897d30             mov qword [rbp+0x30], rdi
0x1804b99e0 488d0d210bb8ff       lea rcx, qword [0x18003a508]
0x1804b99e7 ff1563eadeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804b99ed 488bd8               mov rbx, rax
0x1804b99f0 488bc8               mov rcx, rax
0x1804b99f3 e8c808f3ff           call 0x1803ea2c0
0x1804b99f8 488d156907c5ff       lea rdx, qword [0x18010a168]
0x1804b99ff 4c8bc7               mov r8, rdi
0x1804b9a02 488bcb               mov rcx, rbx
0x1804b9a05 e8265cfeff           call 0x18049f630
0x1804b9a0a 48894520             mov qword [rbp+0x20], rax
0x1804b9a0e e857000000           call 0x1804b9a6a
0x1804b9a13 e86b000000           call 0x1804b9a83
0x1804b9a18 eb1b                 jmp 0x1804b9a35
0x1804b9a1a 837d0000             cmp dword [rbp], 0x00
0x1804b9a1e 7d1a                 jnl 0x1804b9a3a
0x1804b9a20 488b4d28             mov rcx, qword [rbp+0x28]
0x1804b9a24 4885c9               test rcx, rcx
0x1804b9a27 7411                 jz 0x1804b9a3a
0x1804b9a29 4c8d1550bbe4ff       lea r10, qword [0x180305580]
0x1804b9a30 41ff12               call qword [r10]
0x1804b9a33 eb05                 jmp 0x1804b9a3a
0x1804b9a35 e863000000           call 0x1804b9a9d
0x1804b9a3a 488b8da0000000       mov rcx, qword [rbp+0xa0]
0x1804b9a41 c701feffffff         mov dword [rcx], 0xfffffffe
0x1804b9a47 488d152a25b9ff       lea rdx, qword [0x18004bf78]
0x1804b9a4e 4883c108             add rcx, 0x08
0x1804b9a52 4c8b4520             mov r8, qword [rbp+0x20]
0x1804b9a56 ff151c5adeff         call qword [0x18029f478]
0x1804b9a5c 90                   nop
0x1804b9a5d 488d6568             lea rsp, qword [rbp+0x68]
0x1804b9a61 415f                 pop r15
0x1804b9a63 415e                 pop r14
0x1804b9a65 5f                   pop rdi
0x1804b9a66 5e                   pop rsi
0x1804b9a67 5b                   pop rbx
0x1804b9a68 5d                   pop rbp
0x1804b9a69 c3                   ret
0x1804b9a6a 4883ec28             sub rsp, 0x28
0x1804b9a6e 837d0000             cmp dword [rbp], 0x00
0x1804b9a72 7d09                 jnl 0x1804b9a7d
0x1804b9a74 488b4d30             mov rcx, qword [rbp+0x30]
0x1804b9a78 e8e3bbfdff           call 0x180495660
0x1804b9a7d 90                   nop
0x1804b9a7e 4883c428             add rsp, 0x28
0x1804b9a82 c3                   ret
0x1804b9a83 4883ec28             sub rsp, 0x28
0x1804b9a87 837d0000             cmp dword [rbp], 0x00
0x1804b9a8b 7d0a                 jnl 0x1804b9a97
0x1804b9a8d 488b4d38             mov rcx, qword [rbp+0x38]
0x1804b9a91 ff15615cdeff         call qword [0x18029f6f8]
0x1804b9a97 90                   nop
0x1804b9a98 4883c428             add rsp, 0x28
0x1804b9a9c c3                   ret
0x1804b9a9d 4883ec28             sub rsp, 0x28
0x1804b9aa1 837d0000             cmp dword [rbp], 0x00
0x1804b9aa5 7d13                 jnl 0x1804b9aba
0x1804b9aa7 488b4d28             mov rcx, qword [rbp+0x28]
0x1804b9aab 4885c9               test rcx, rcx
0x1804b9aae 740a                 jz 0x1804b9aba
0x1804b9ab0 4c8d15d9bae4ff       lea r10, qword [0x180305590]
0x1804b9ab7 41ff12               call qword [r10]
0x1804b9aba 90                   nop
0x1804b9abb 4883c428             add rsp, 0x28
0x1804b9abf c3                   ret
0x1804b9ac0 4883ec28             sub rsp, 0x28
0x1804b9ac4 4c8bc1               mov r8, rcx
0x1804b9ac7 48894d40             mov qword [rbp+0x40], rcx
0x1804b9acb 488b8da0000000       mov rcx, qword [rbp+0xa0]
0x1804b9ad2 c701feffffff         mov dword [rcx], 0xfffffffe
0x1804b9ad8 488d159924b9ff       lea rdx, qword [0x18004bf78]
0x1804b9adf 4883c108             add rcx, 0x08
0x1804b9ae3 ff159759deff         call qword [0x18029f480]
