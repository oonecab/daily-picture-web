; Re-rendered subset, not a new REA observation.
; Source: evidence/deep-cache/storage-json.json
; Evidence: ev_e559ec21919cdf6b212f0ca080a9bd67dc539290d48532d43846200b774840eb
; Target: d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a
0x1804ba4b0 55                   push rbp
0x1804ba4b1 53                   push rbx
0x1804ba4b2 56                   push rsi
0x1804ba4b3 57                   push rdi
0x1804ba4b4 4883ec68             sub rsp, 0x68
0x1804ba4b8 488d6c2420           lea rbp, qword [rsp+0x20]
0x1804ba4bd 48894d70             mov qword [rbp+0x70], rcx
0x1804ba4c1 488bf9               mov rdi, rcx
0x1804ba4c4 33db                 xor ebx, ebx
0x1804ba4c6 48895d08             mov qword [rbp+0x08], rbx
0x1804ba4ca 48895d30             mov qword [rbp+0x30], rbx
0x1804ba4ce 8b01                 mov eax, dword [rcx]
0x1804ba4d0 894500               mov dword [rbp], eax
0x1804ba4d3 48895d28             mov qword [rbp+0x28], rbx
0x1804ba4d7 90                   nop
0x1804ba4d8 85c0                 test eax, eax
0x1804ba4da 0f84cf000000         jz 0x1804ba5af
0x1804ba4e0 48395918             cmp qword [rcx+0x18], rbx
0x1804ba4e4 7529                 jnz 0x1804ba50f
0x1804ba4e6 488b0d13bedeff       mov rcx, qword [0x1802a6300]
0x1804ba4ed ff155ddfdeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804ba4f3 488bd8               mov rbx, rax
0x1804ba4f6 488d15abbce0ff       lea rdx, qword [0x1802c61a8]
0x1804ba4fd 488bc8               mov rcx, rax
0x1804ba500 ff150a72deff         call qword [0x1802a1710]
0x1804ba506 488bcb               mov rcx, rbx
0x1804ba509 ff15b9dfdeff         call qword [sym.imp.mrt100_app.dll_RhpThrowEx]
0x1804ba50f 488d159a26b5ff       lea rdx, qword [0x18000cbb0]
0x1804ba516 488d0db3b4e0ff       lea rcx, qword [0x1802c59d0]
0x1804ba51d ff158573deff         call qword [0x1802a18a8]
0x1804ba523 488d0d5e4fc5ff       lea rcx, qword [0x18010f488]
0x1804ba52a 41b806000000         mov r8d, 0x06
0x1804ba530 488bd0               mov rdx, rax
0x1804ba533 e85880f4ff           call 0x180402590
0x1804ba538 803800               cmp byte [rax], 0x00
0x1804ba53b 488d0d5e4fc5ff       lea rcx, qword [0x18010f4a0]
0x1804ba542 41b80c000000         mov r8d, 0x0c
0x1804ba548 488bd0               mov rdx, rax
0x1804ba54b e84080f4ff           call 0x180402590
0x1804ba550 488d157191e0ff       lea rdx, qword [0x1802c36c8]
0x1804ba557 41b801000000         mov r8d, 0x01
0x1804ba55d 488bc8               mov rcx, rax
0x1804ba560 e8bb010000           call 0x1804ba720
0x1804ba565 803800               cmp byte [rax], 0x00
0x1804ba568 48895d30             mov qword [rbp+0x30], rbx
0x1804ba56c 48894508             mov qword [rbp+0x08], rax
0x1804ba570 488bc8               mov rcx, rax
0x1804ba573 ff150f6ddeff         call qword [0x1802a1288]
0x1804ba579 84c0                 test al, al
0x1804ba57b 752c                 jnz 0x1804ba5a9
0x1804ba57d 891f                 mov dword [rdi], ebx
0x1804ba57f 488d4f20             lea rcx, qword [rdi+0x20]
0x1804ba583 488b5508             mov rdx, qword [rbp+0x08]
0x1804ba587 ff15fbdedeff         call qword [sym.imp.mrt100_app.dll_RhpCheckedAssignRefEDX]
0x1804ba58d 488d151428c5ff       lea rdx, qword [0x18010cda8]
0x1804ba594 488d4f08             lea rcx, qword [rdi+0x08]
0x1804ba598 4c8bcf               mov r9, rdi
0x1804ba59b 4c8d4508             lea r8, qword [rbp+0x08]
0x1804ba59f e81c21fcff           call 0x18047c6c0
0x1804ba5a4 e9ec000000           jmp 0x1804ba695
0x1804ba5a9 488b4d08             mov rcx, qword [rbp+0x08]
0x1804ba5ad eb19                 jmp 0x1804ba5c8
0x1804ba5af 488b4920             mov rcx, qword [rcx+0x20]
0x1804ba5b3 48894d08             mov qword [rbp+0x08], rcx
0x1804ba5b7 48895f20             mov qword [rdi+0x20], rbx
0x1804ba5bb c74500ffffffff       mov dword [rbp], 0xffffffff
0x1804ba5c2 c707ffffffff         mov dword [rdi], 0xffffffff
0x1804ba5c8 ff15e254deff         call qword [0x18029fab0]
0x1804ba5ce 488b4508             mov rax, qword [rbp+0x08]
0x1804ba5d2 488b7048             mov rsi, qword [rax+0x48]
0x1804ba5d6 48897520             mov qword [rbp+0x20], rsi
0x1804ba5da 90                   nop
0x1804ba5db 488b0db6acdeff       mov rcx, qword [0x1802a5298]
0x1804ba5e2 ff1568dedeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804ba5e8 488bd8               mov rbx, rax
0x1804ba5eb 488bd6               mov rdx, rsi
0x1804ba5ee 488bc8               mov rcx, rax
0x1804ba5f1 ff15c14fdeff         call qword [0x18029f5b8]
0x1804ba5f7 48895d18             mov qword [rbp+0x18], rbx
0x1804ba5fb 90                   nop
0x1804ba5fc 488d0d7d77b5ff       lea rcx, qword [0x180011d80]
0x1804ba603 ff1547dedeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804ba609 488bf0               mov rsi, rax
0x1804ba60c 488bd3               mov rdx, rbx
0x1804ba60f 488bc8               mov rcx, rax
0x1804ba612 e8e9f4f2ff           call 0x1803e9b00
0x1804ba617 48897510             mov qword [rbp+0x10], rsi
0x1804ba61b 488d0de6feb7ff       lea rcx, qword [0x18003a508]
0x1804ba622 ff1528dedeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804ba628 488bd8               mov rbx, rax
0x1804ba62b 488bc8               mov rcx, rax
0x1804ba62e e88dfcf2ff           call 0x1803ea2c0
0x1804ba633 4533c9               xor r9d, r9d
0x1804ba636 4c8b4718             mov r8, qword [rdi+0x18]
0x1804ba63a 488bd6               mov rdx, rsi
0x1804ba63d 488bcb               mov rcx, rbx
0x1804ba640 e8bbccfaff           call 0x180467300
0x1804ba645 90                   nop
0x1804ba646 837d0000             cmp dword [rbp], 0x00
0x1804ba64a 7d09                 jnl 0x1804ba655
0x1804ba64c 488b4d10             mov rcx, qword [rbp+0x10]
0x1804ba650 e87bb5f2ff           call 0x1803e5bd0
0x1804ba655 90                   nop
0x1804ba656 837d0000             cmp dword [rbp], 0x00
0x1804ba65a 7d0a                 jnl 0x1804ba666
0x1804ba65c 488b4d18             mov rcx, qword [rbp+0x18]
0x1804ba660 ff15a250deff         call qword [0x18029f708]
0x1804ba666 90                   nop
0x1804ba667 837d0000             cmp dword [rbp], 0x00
0x1804ba66b 7d13                 jnl 0x1804ba680
0x1804ba66d 488b4d20             mov rcx, qword [rbp+0x20]
0x1804ba671 4885c9               test rcx, rcx
0x1804ba674 740a                 jz 0x1804ba680
0x1804ba676 4c8d1583afe4ff       lea r10, qword [0x180305600]
0x1804ba67d 41ff12               call qword [r10]
0x1804ba680 90                   nop
0x1804ba681 488b4d70             mov rcx, qword [rbp+0x70]
0x1804ba685 c701feffffff         mov dword [rcx], 0xfffffffe
0x1804ba68b 4883c108             add rcx, 0x08
0x1804ba68f ff15bb4ddeff         call qword [0x18029f450]
0x1804ba695 90                   nop
0x1804ba696 488d6548             lea rsp, qword [rbp+0x48]
0x1804ba69a 5f                   pop rdi
0x1804ba69b 5e                   pop rsi
0x1804ba69c 5b                   pop rbx
0x1804ba69d 5d                   pop rbp
0x1804ba69e c3                   ret
0x1804ba69f 4883ec28             sub rsp, 0x28
0x1804ba6a3 837d0000             cmp dword [rbp], 0x00
0x1804ba6a7 7d09                 jnl 0x1804ba6b2
0x1804ba6a9 488b4d10             mov rcx, qword [rbp+0x10]
0x1804ba6ad e81eb5f2ff           call 0x1803e5bd0
0x1804ba6b2 90                   nop
0x1804ba6b3 4883c428             add rsp, 0x28
0x1804ba6b7 c3                   ret
0x1804ba6b8 4883ec28             sub rsp, 0x28
0x1804ba6bc 837d0000             cmp dword [rbp], 0x00
0x1804ba6c0 7d0a                 jnl 0x1804ba6cc
0x1804ba6c2 488b4d18             mov rcx, qword [rbp+0x18]
0x1804ba6c6 ff153c50deff         call qword [0x18029f708]
0x1804ba6cc 90                   nop
0x1804ba6cd 4883c428             add rsp, 0x28
0x1804ba6d1 c3                   ret
0x1804ba6d2 4883ec28             sub rsp, 0x28
0x1804ba6d6 837d0000             cmp dword [rbp], 0x00
0x1804ba6da 7d13                 jnl 0x1804ba6ef
0x1804ba6dc 488b4d20             mov rcx, qword [rbp+0x20]
0x1804ba6e0 4885c9               test rcx, rcx
0x1804ba6e3 740a                 jz 0x1804ba6ef
0x1804ba6e5 4c8d1524afe4ff       lea r10, qword [0x180305610]
0x1804ba6ec 41ff12               call qword [r10]
0x1804ba6ef 90                   nop
0x1804ba6f0 4883c428             add rsp, 0x28
0x1804ba6f4 c3                   ret
0x1804ba6f5 4883ec28             sub rsp, 0x28
0x1804ba6f9 488bd1               mov rdx, rcx
0x1804ba6fc 48894d28             mov qword [rbp+0x28], rcx
0x1804ba700 488b4d70             mov rcx, qword [rbp+0x70]
0x1804ba704 c701feffffff         mov dword [rcx], 0xfffffffe
0x1804ba70a 4883c108             add rcx, 0x08
0x1804ba70e ff15444ddeff         call qword [0x18029f458]
0x1804ba714 488d057affffff       lea rax, qword [0x1804ba695]
0x1804ba71b 4883c428             add rsp, 0x28
0x1804ba71f c3                   ret
0x1804ba720 53                   push rbx
0x1804ba721 56                   push rsi
0x1804ba722 57                   push rdi
0x1804ba723 4883ec20             sub rsp, 0x20
0x1804ba727 418bf0               mov esi, r8d
0x1804ba72a 488bda               mov rbx, rdx
0x1804ba72d 488bf9               mov rdi, rcx
0x1804ba730 4885c9               test rcx, rcx
0x1804ba733 7429                 jz 0x1804ba75e
0x1804ba735 4885d2               test rdx, rdx
0x1804ba738 7432                 jz 0x1804ba76c
0x1804ba73a 488bca               mov rcx, rdx
0x1804ba73d ff15f586deff         call qword [0x1802a2e38]
0x1804ba743 84c0                 test al, al
0x1804ba745 7533                 jnz 0x1804ba77a
0x1804ba747 448bc6               mov r8d, esi
0x1804ba74a 488bd3               mov rdx, rbx
0x1804ba74d 488bcf               mov rcx, rdi
0x1804ba750 e85b000000           call 0x1804ba7b0
0x1804ba755 90                   nop
0x1804ba756 4883c420             add rsp, 0x20
0x1804ba75a 5f                   pop rdi
0x1804ba75b 5e                   pop rsi
0x1804ba75c 5b                   pop rbx
0x1804ba75d c3                   ret
0x1804ba75e e89d54f2ff           call 0x1803dfc00
0x1804ba763 488bc8               mov rcx, rax
0x1804ba766 ff155cdddeff         call qword [sym.imp.mrt100_app.dll_RhpThrowEx]
0x1804ba76c e88f54f2ff           call 0x1803dfc00
0x1804ba771 488bc8               mov rcx, rax
0x1804ba774 ff154edddeff         call qword [sym.imp.mrt100_app.dll_RhpThrowEx]
0x1804ba77a e811000000           call 0x1804ba790
0x1804ba77f 488bc8               mov rcx, rax
0x1804ba782 ff1540dddeff         call qword [sym.imp.mrt100_app.dll_RhpThrowEx]
0x1804ba788 cc                   int3
0x1804ba789 cc                   int3
0x1804ba78a cc                   int3
0x1804ba78b cc                   int3
0x1804ba78c cc                   int3
0x1804ba78d cc                   int3
0x1804ba78e cc                   int3
0x1804ba78f cc                   int3
0x1804ba790 4883ec28             sub rsp, 0x28
0x1804ba794 488d0d3dbae0ff       lea rcx, qword [0x1802c61d8]
0x1804ba79b e87040f4ff           call 0x1803fe810
0x1804ba7a0 90                   nop
0x1804ba7a1 4883c428             add rsp, 0x28
0x1804ba7a5 c3                   ret
0x1804ba7a6 cc                   int3
0x1804ba7a7 cc                   int3
0x1804ba7a8 cc                   int3
0x1804ba7a9 cc                   int3
0x1804ba7aa cc                   int3
0x1804ba7ab cc                   int3
0x1804ba7ac cc                   int3
0x1804ba7ad cc                   int3
0x1804ba7ae cc                   int3
0x1804ba7af cc                   int3
0x1804ba7b0 53                   push rbx
0x1804ba7b1 56                   push rsi
0x1804ba7b2 57                   push rdi
0x1804ba7b3 4156                 push r14
0x1804ba7b5 4881ecb8000000       sub rsp, 0xb8
0x1804ba7bc 418bd8               mov ebx, r8d
0x1804ba7bf 488bfa               mov rdi, rdx
0x1804ba7c2 488bf1               mov rsi, rcx
0x1804ba7c5 33d2                 xor edx, edx
0x1804ba7c7 448d4268             lea r8d, qword [rdx+0x68]
0x1804ba7cb 488d4c2440           lea rcx, qword [rsp+0x40]
0x1804ba7d0 ff1572dddeff         call qword [sym.imp.mrt100_app.dll_RhpInitMultibyte]
0x1804ba7d6 4533f6               xor r14d, r14d
0x1804ba7d9 33c0                 xor eax, eax
0x1804ba7db 4889442420           mov qword [rsp+0x20], rax
0x1804ba7e0 4889442428           mov qword [rsp+0x28], rax
0x1804ba7e5 4889742458           mov qword [rsp+0x58], rsi
0x1804ba7ea 48897c2460           mov qword [rsp+0x60], rdi
0x1804ba7ef 895c2468             mov dword [rsp+0x68], ebx
0x1804ba7f3 488b157eb6deff       mov rdx, qword [0x1802a5e78]
0x1804ba7fa 488bc2               mov rax, rdx
0x1804ba7fd 4883c2f0             add rdx, 0xfffffffffffffff0
0x1804ba801 ff1541dcdeff         call qword [sym.imp.mrt100_app.dll_RhpCheckCctor2]
0x1804ba807 ff157b68deff         call qword [0x1802a1088]
0x1804ba80d 84c0                 test al, al
0x1804ba80f 751e                 jnz 0x1804ba82f
0x1804ba811 488b1598b7deff       mov rdx, qword [0x1802a5fb0]
0x1804ba818 488bc2               mov rax, rdx
0x1804ba81b 4883c2f0             add rdx, 0xfffffffffffffff0
0x1804ba81f ff1523dcdeff         call qword [sym.imp.mrt100_app.dll_RhpCheckCctor2]
0x1804ba825 44387004             cmp byte [rax+0x04], r14b
0x1804ba829 7504                 jnz 0x1804ba82f
0x1804ba82b 33db                 xor ebx, ebx
0x1804ba82d eb21                 jmp 0x1804ba850
0x1804ba82f 498bde               mov rbx, r14
0x1804ba832 4d85f6               test r14, r14
0x1804ba835 7519                 jnz 0x1804ba850
0x1804ba837 488d0d3ad9bbff       lea rcx, qword [0x180078178]
0x1804ba83e ff150cdcdeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804ba844 488bd8               mov rbx, rax
0x1804ba847 488bc8               mov rcx, rax
0x1804ba84a ff15a069deff         call qword [0x1802a11f0]
0x1804ba850 488bcb               mov rcx, rbx
0x1804ba853 488d151ed9bbff       lea rdx, qword [0x180078178]
0x1804ba85a ff1598dcdeff         call qword [sym.imp.mrt100_app.dll_RhTypeCast_CheckCastClass]
0x1804ba860 488bd8               mov rbx, rax
0x1804ba863 4885c0               test rax, rax
0x1804ba866 740c                 jz 0x1804ba874
0x1804ba868 443830               cmp byte [rax], r14b
0x1804ba86b 488bc8               mov rcx, rax
0x1804ba86e ff15dc69deff         call qword [0x1802a1250]
0x1804ba874 4c89742448           mov qword [rsp+0x48], r14
0x1804ba879 48895c2450           mov qword [rsp+0x50], rbx
0x1804ba87e c7442440ffffffff     mov dword [rsp+0x40], 0xffffffff
0x1804ba886 33c0                 xor eax, eax
0x1804ba888 4889442420           mov qword [rsp+0x20], rax
0x1804ba88d 4889442428           mov qword [rsp+0x28], rax
0x1804ba892 488d4c2420           lea rcx, qword [rsp+0x20]
0x1804ba897 ff15cb5edeff         call qword [0x1802a0768]
0x1804ba89d 488d4c2440           lea rcx, qword [rsp+0x40]
0x1804ba8a2 e849000000           call 0x1804ba8f0
0x1804ba8a7 488d4c2420           lea rcx, qword [rsp+0x20]
0x1804ba8ac ff159e5edeff         call qword [0x1802a0750]
0x1804ba8b2 488b5c2450           mov rbx, qword [rsp+0x50]
0x1804ba8b7 4885db               test rbx, rbx
0x1804ba8ba 7519                 jnz 0x1804ba8d5
0x1804ba8bc 488d0db5d8bbff       lea rcx, qword [0x180078178]
0x1804ba8c3 ff1587dbdeff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804ba8c9 488bd8               mov rbx, rax
0x1804ba8cc 488bc8               mov rcx, rax
0x1804ba8cf ff151b69deff         call qword [0x1802a11f0]
0x1804ba8d5 488bc3               mov rax, rbx
0x1804ba8d8 4881c4b8000000       add rsp, 0xb8
0x1804ba8df 415e                 pop r14
0x1804ba8e1 5f                   pop rdi
0x1804ba8e2 5e                   pop rsi
0x1804ba8e3 5b                   pop rbx
0x1804ba8e4 c3                   ret
0x1804ba8e5 cc                   int3
0x1804ba8e6 cc                   int3
0x1804ba8e7 cc                   int3
0x1804ba8e8 cc                   int3
0x1804ba8e9 cc                   int3
0x1804ba8ea cc                   int3
0x1804ba8eb cc                   int3
0x1804ba8ec cc                   int3
0x1804ba8ed cc                   int3
0x1804ba8ee cc                   int3
0x1804ba8ef cc                   int3
0x1804ba8f0 55                   push rbp
0x1804ba8f1 53                   push rbx
0x1804ba8f2 56                   push rsi
0x1804ba8f3 57                   push rdi
0x1804ba8f4 4881ec68010000       sub rsp, 0x168
0x1804ba8fb 488d6c2420           lea rbp, qword [rsp+0x20]
0x1804ba900 48898d70010000       mov qword [rbp+0x170], rcx
0x1804ba907 488bf9               mov rdi, rcx
0x1804ba90a 33c0                 xor eax, eax
0x1804ba90c 48894500             mov qword [rbp], rax
0x1804ba910 48894508             mov qword [rbp+0x08], rax
0x1804ba914 48894558             mov qword [rbp+0x58], rax
0x1804ba918 48894560             mov qword [rbp+0x60], rax
0x1804ba91c 48894510             mov qword [rbp+0x10], rax
0x1804ba920 48894518             mov qword [rbp+0x18], rax
0x1804ba924 48894578             mov qword [rbp+0x78], rax
0x1804ba928 48898580000000       mov qword [rbp+0x80], rax
0x1804ba92f 48894520             mov qword [rbp+0x20], rax
0x1804ba933 48894528             mov qword [rbp+0x28], rax
0x1804ba937 48898588000000       mov qword [rbp+0x88], rax
0x1804ba93e 48898590000000       mov qword [rbp+0x90], rax
0x1804ba945 48898598000000       mov qword [rbp+0x98], rax
0x1804ba94c 488985b8000000       mov qword [rbp+0xb8], rax
0x1804ba953 488985c8000000       mov qword [rbp+0xc8], rax
0x1804ba95a 488985e8000000       mov qword [rbp+0xe8], rax
0x1804ba961 48894548             mov qword [rbp+0x48], rax
0x1804ba965 48898508010000       mov qword [rbp+0x108], rax
0x1804ba96c 488985a8000000       mov qword [rbp+0xa8], rax
0x1804ba973 48894568             mov qword [rbp+0x68], rax
0x1804ba977 48898518010000       mov qword [rbp+0x118], rax
0x1804ba97e 488985d8000000       mov qword [rbp+0xd8], rax
0x1804ba985 488985f8000000       mov qword [rbp+0xf8], rax
0x1804ba98c 48898528010000       mov qword [rbp+0x128], rax
0x1804ba993 486301               movsxd rax, dword [rcx]
0x1804ba996 33f6                 xor esi, esi
0x1804ba998 48897540             mov qword [rbp+0x40], rsi
0x1804ba99c 48897530             mov qword [rbp+0x30], rsi
0x1804ba9a0 90                   nop
0x1804ba9a1 48897538             mov qword [rbp+0x38], rsi
0x1804ba9a5 83f803               cmp eax, 0x03
0x1804ba9a8 0f8384000000         jnb 0x1804baa32
0x1804ba9ae 488bc8               mov rcx, rax
0x1804ba9b1 488d05509ec8ff       lea rax, qword [0x180144808]
0x1804ba9b8 48630c88             movsxd rcx, dword [rax+rcx*4]
0x1804ba9bc 4803c8               add rcx, rax
0x1804ba9bf ffe1                 jmp rcx
0x1804ba9c1 ebfe                 jmp 0x1804ba9c1
0x1804ba9c3 488b4f38             mov rcx, qword [rdi+0x38]
0x1804ba9c7 48894d00             mov qword [rbp], rcx
0x1804ba9cb 488b4740             mov rax, qword [rdi+0x40]
0x1804ba9cf 48894508             mov qword [rbp+0x08], rax
0x1804ba9d3 33c0                 xor eax, eax
0x1804ba9d5 48894738             mov qword [rdi+0x38], rax
0x1804ba9d9 48894740             mov qword [rdi+0x40], rax
0x1804ba9dd c707ffffffff         mov dword [rdi], 0xffffffff
0x1804ba9e3 e920010000           jmp 0x1804bab08
0x1804ba9e8 488b4f48             mov rcx, qword [rdi+0x48]
0x1804ba9ec 48894d10             mov qword [rbp+0x10], rcx
0x1804ba9f0 488b4750             mov rax, qword [rdi+0x50]
0x1804ba9f4 48894518             mov qword [rbp+0x18], rax
0x1804ba9f8 33c0                 xor eax, eax
0x1804ba9fa 48894748             mov qword [rdi+0x48], rax
0x1804ba9fe 48894750             mov qword [rdi+0x50], rax
0x1804baa02 c707ffffffff         mov dword [rdi], 0xffffffff
0x1804baa08 e9fc010000           jmp 0x1804bac09
0x1804baa0d 488b4f58             mov rcx, qword [rdi+0x58]
0x1804baa11 48894d20             mov qword [rbp+0x20], rcx
0x1804baa15 488b4760             mov rax, qword [rdi+0x60]
0x1804baa19 48894528             mov qword [rbp+0x28], rax
0x1804baa1d 33c0                 xor eax, eax
0x1804baa1f 48894758             mov qword [rdi+0x58], rax
0x1804baa23 48894760             mov qword [rdi+0x60], rax
0x1804baa27 c707ffffffff         mov dword [rdi], 0xffffffff
0x1804baa2d e9a2020000           jmp 0x1804bacd4
0x1804baa32 488b4918             mov rcx, qword [rcx+0x18]
0x1804baa36 803900               cmp byte [rcx], 0x00
0x1804baa39 448b4728             mov r8d, dword [rdi+0x28]
0x1804baa3d 488b5720             mov rdx, qword [rdi+0x20]
0x1804baa41 4c8d15d8abe4ff       lea r10, qword [0x180305620]
0x1804baa48 41ff12               call qword [r10]
0x1804baa4b 488bd8               mov rbx, rax
0x1804baa4e ff15fc58deff         call qword [0x1802a0350]
0x1804baa54 488d0db547c5ff       lea rcx, qword [0x18010f210]
0x1804baa5b 4c8bc0               mov r8, rax
0x1804baa5e 488bd3               mov rdx, rbx
0x1804baa61 e80a34fcff           call 0x18047de70
0x1804baa66 803800               cmp byte [rax], 0x00
0x1804baa69 33c9                 xor ecx, ecx
0x1804baa6b 48894d48             mov qword [rbp+0x48], rcx
0x1804baa6f 48894d50             mov qword [rbp+0x50], rcx
0x1804baa73 4533c0               xor r8d, r8d
0x1804baa76 4c898508010000       mov qword [rbp+0x108], r8
0x1804baa7d 48894548             mov qword [rbp+0x48], rax
0x1804baa81 4c894550             mov qword [rbp+0x50], r8
0x1804baa85 48898598000000       mov qword [rbp+0x98], rax
0x1804baa8c 4c8985a0000000       mov qword [rbp+0xa0], r8
0x1804baa93 48894558             mov qword [rbp+0x58], rax
0x1804baa97 4c894560             mov qword [rbp+0x60], r8
0x1804baa9b 488985a8000000       mov qword [rbp+0xa8], rax
0x1804baaa2 4c8985b0000000       mov qword [rbp+0xb0], r8
0x1804baaa9 488985b8000000       mov qword [rbp+0xb8], rax
0x1804baab0 4c8985c0000000       mov qword [rbp+0xc0], r8
0x1804baab7 48894500             mov qword [rbp], rax
0x1804baabb 4c894508             mov qword [rbp+0x08], r8
0x1804baabf 3808                 cmp byte [rax], cl
0x1804baac1 488bc8               mov rcx, rax
0x1804baac4 ff15be67deff         call qword [0x1802a1288]
0x1804baaca 84c0                 test al, al
0x1804baacc 7536                 jnz 0x1804bab04
0x1804baace 8937                 mov dword [rdi], esi
0x1804baad0 488d4f38             lea rcx, qword [rdi+0x38]
0x1804baad4 488b5500             mov rdx, qword [rbp]
0x1804baad8 ff15aad9deff         call qword [sym.imp.mrt100_app.dll_RhpCheckedAssignRefEDX]
0x1804baade f20f104508           movsd xmm0, qword [rbp+0x08]
0x1804baae3 f20f114740           movsd qword [rdi+0x40], xmm0
0x1804baae8 488d15c14bc5ff       lea rdx, qword [0x18010f6b0]
0x1804baaef 488d4f08             lea rcx, qword [rdi+0x08]
0x1804baaf3 4c8bcf               mov r9, rdi
0x1804baaf6 4c8d4500             lea r8, qword [rbp]
0x1804baafa e881f7fbff           call 0x18047a280
0x1804baaff e90e020000           jmp 0x1804bad12
0x1804bab04 488b4d00             mov rcx, qword [rbp]
0x1804bab08 ff15a24fdeff         call qword [0x18029fab0]
0x1804bab0e 488b4500             mov rax, qword [rbp]
0x1804bab12 33c9                 xor ecx, ecx
0x1804bab14 48894d00             mov qword [rbp], rcx
0x1804bab18 48894d08             mov qword [rbp+0x08], rcx
0x1804bab1c 488d4f30             lea rcx, qword [rdi+0x30]
0x1804bab20 488b5048             mov rdx, qword [rax+0x48]
0x1804bab24 ff155ed9deff         call qword [sym.imp.mrt100_app.dll_RhpCheckedAssignRefEDX]
0x1804bab2a 837f2803             cmp dword [rdi+0x28], 0x03
0x1804bab2e 0f8517010000         jnz 0x1804bac4b
0x1804bab34 488b4f30             mov rcx, qword [rdi+0x30]
0x1804bab38 803900               cmp byte [rcx], 0x00
0x1804bab3b 4c8d15eeaae4ff       lea r10, qword [0x180305630]
0x1804bab42 41ff12               call qword [r10]
0x1804bab45 488bd8               mov rbx, rax
0x1804bab48 ff150258deff         call qword [0x1802a0350]
0x1804bab4e 488d0d834bc5ff       lea rcx, qword [0x18010f6d8]
0x1804bab55 4c8bc0               mov r8, rax
0x1804bab58 488bd3               mov rdx, rbx
0x1804bab5b e81033fcff           call 0x18047de70
0x1804bab60 803800               cmp byte [rax], 0x00
0x1804bab63 33c9                 xor ecx, ecx
0x1804bab65 48894d68             mov qword [rbp+0x68], rcx
0x1804bab69 48894d70             mov qword [rbp+0x70], rcx
0x1804bab6d 4533c0               xor r8d, r8d
0x1804bab70 4c898518010000       mov qword [rbp+0x118], r8
0x1804bab77 48894568             mov qword [rbp+0x68], rax
0x1804bab7b 4c894570             mov qword [rbp+0x70], r8
0x1804bab7f 488985c8000000       mov qword [rbp+0xc8], rax
0x1804bab86 4c8985d0000000       mov qword [rbp+0xd0], r8
0x1804bab8d 48894578             mov qword [rbp+0x78], rax
0x1804bab91 4c898580000000       mov qword [rbp+0x80], r8
0x1804bab98 488985d8000000       mov qword [rbp+0xd8], rax
0x1804bab9f 4c8985e0000000       mov qword [rbp+0xe0], r8
0x1804baba6 488985e8000000       mov qword [rbp+0xe8], rax
0x1804babad 4c8985f0000000       mov qword [rbp+0xf0], r8
0x1804babb4 48894510             mov qword [rbp+0x10], rax
0x1804babb8 4c894518             mov qword [rbp+0x18], r8
0x1804babbc 3808                 cmp byte [rax], cl
0x1804babbe 488bc8               mov rcx, rax
0x1804babc1 ff15c166deff         call qword [0x1802a1288]
0x1804babc7 84c0                 test al, al
0x1804babc9 753a                 jnz 0x1804bac05
0x1804babcb c70701000000         mov dword [rdi], 0x01
0x1804babd1 488d4f48             lea rcx, qword [rdi+0x48]
0x1804babd5 488b5510             mov rdx, qword [rbp+0x10]
0x1804babd9 ff15a9d8deff         call qword [sym.imp.mrt100_app.dll_RhpCheckedAssignRefEDX]
0x1804babdf f20f104518           movsd xmm0, qword [rbp+0x18]
0x1804babe4 f20f114750           movsd qword [rdi+0x50], xmm0
0x1804babe9 488d15384bc5ff       lea rdx, qword [0x18010f728]
0x1804babf0 488d4f08             lea rcx, qword [rdi+0x08]
0x1804babf4 4c8bcf               mov r9, rdi
0x1804babf7 4c8d4510             lea r8, qword [rbp+0x10]
0x1804babfb e880f6fbff           call 0x18047a280
0x1804bac00 e90d010000           jmp 0x1804bad12
0x1804bac05 488b4d10             mov rcx, qword [rbp+0x10]
0x1804bac09 ff15a14edeff         call qword [0x18029fab0]
0x1804bac0f 488b4510             mov rax, qword [rbp+0x10]
0x1804bac13 488b5048             mov rdx, qword [rax+0x48]
0x1804bac17 33c0                 xor eax, eax
0x1804bac19 48894510             mov qword [rbp+0x10], rax
0x1804bac1d 48894518             mov qword [rbp+0x18], rax
0x1804bac21 3802                 cmp byte [rdx], al
0x1804bac23 488d0d264bc5ff       lea rcx, qword [0x18010f750]
0x1804bac2a 448d4006             lea r8d, qword [rax+0x06]
0x1804bac2e e87da2fbff           call 0x180474eb0
0x1804bac33 488bf0               mov rsi, rax
0x1804bac36 48b8ffffffffffffff7f mov rax, 0x7fffffffffffffff
0x1804bac40 483bf0               cmp rsi, rax
0x1804bac43 7606                 jbe 0x1804bac4b
0x1804bac45 ff15dd63deff         call qword [0x1802a1028]
0x1804bac4b 488bd6               mov rdx, rsi
0x1804bac4e 488b4f30             mov rcx, qword [rdi+0x30]
0x1804bac52 e839010000           call 0x1804bad90
0x1804bac57 803800               cmp byte [rax], 0x00
0x1804bac5a 33c9                 xor ecx, ecx
0x1804bac5c 48898df8000000       mov qword [rbp+0xf8], rcx
0x1804bac63 48898d00010000       mov qword [rbp+0x100], rcx
0x1804bac6a 4533c0               xor r8d, r8d
0x1804bac6d 4c898528010000       mov qword [rbp+0x128], r8
0x1804bac74 48898588000000       mov qword [rbp+0x88], rax
0x1804bac7b 4c898590000000       mov qword [rbp+0x90], r8
0x1804bac82 48894520             mov qword [rbp+0x20], rax
0x1804bac86 4c894528             mov qword [rbp+0x28], r8
0x1804bac8a 3808                 cmp byte [rax], cl
0x1804bac8c 488bc8               mov rcx, rax
0x1804bac8f ff15f365deff         call qword [0x1802a1288]
0x1804bac95 84c0                 test al, al
0x1804bac97 7537                 jnz 0x1804bacd0
0x1804bac99 c70702000000         mov dword [rdi], 0x02
0x1804bac9f 488d4f58             lea rcx, qword [rdi+0x58]
0x1804baca3 488b5520             mov rdx, qword [rbp+0x20]
0x1804baca7 ff15dbd7deff         call qword [sym.imp.mrt100_app.dll_RhpCheckedAssignRefEDX]
0x1804bacad f20f104528           movsd xmm0, qword [rbp+0x28]
0x1804bacb2 f20f114760           movsd qword [rdi+0x60], xmm0
0x1804bacb7 488d15ba25c5ff       lea rdx, qword [0x18010d278]
0x1804bacbe 488d4f08             lea rcx, qword [rdi+0x08]
0x1804bacc2 4c8bcf               mov r9, rdi
0x1804bacc5 4c8d4520             lea r8, qword [rbp+0x20]
0x1804bacc9 e8b2f5fbff           call 0x18047a280
0x1804bacce eb42                 jmp 0x1804bad12
0x1804bacd0 488b4d20             mov rcx, qword [rbp+0x20]
0x1804bacd4 ff15d64ddeff         call qword [0x18029fab0]
0x1804bacda 488b4520             mov rax, qword [rbp+0x20]
0x1804bacde 488b4848             mov rcx, qword [rax+0x48]
0x1804bace2 33c0                 xor eax, eax
0x1804bace4 48894520             mov qword [rbp+0x20], rax
0x1804bace8 48894528             mov qword [rbp+0x28], rax
0x1804bacec 48894d30             mov qword [rbp+0x30], rcx
0x1804bacf0 488b8d70010000       mov rcx, qword [rbp+0x170]
0x1804bacf7 c701feffffff         mov dword [rcx], 0xfffffffe
0x1804bacfd 488d158c2fb9ff       lea rdx, qword [0x18004dc90]
0x1804bad04 4883c108             add rcx, 0x08
0x1804bad08 4c8b4530             mov r8, qword [rbp+0x30]
0x1804bad0c ff156647deff         call qword [0x18029f478]
0x1804bad12 90                   nop
0x1804bad13 488da548010000       lea rsp, qword [rbp+0x148]
0x1804bad1a 5f                   pop rdi
0x1804bad1b 5e                   pop rsi
0x1804bad1c 5b                   pop rbx
0x1804bad1d 5d                   pop rbp
0x1804bad1e c3                   ret
0x1804bad1f 4883ec28             sub rsp, 0x28
0x1804bad23 48894d38             mov qword [rbp+0x38], rcx
0x1804bad27 e8e4f0ffff           call 0x1804b9e10
0x1804bad2c 803800               cmp byte [rax], 0x00
0x1804bad2f 488bc8               mov rcx, rax
0x1804bad32 ff15389fdeff         call qword [0x1802a4c70]
0x1804bad38 48c7453000000000     mov qword [rbp+0x30], 0x00
0x1804bad40 488d05a9ffffff       lea rax, qword [0x1804bacf0]
0x1804bad47 4883c428             add rsp, 0x28
0x1804bad4b c3                   ret
0x1804bad4c 4883ec28             sub rsp, 0x28
0x1804bad50 4c8bc1               mov r8, rcx
0x1804bad53 48894d40             mov qword [rbp+0x40], rcx
0x1804bad57 488b8d70010000       mov rcx, qword [rbp+0x170]
0x1804bad5e c701feffffff         mov dword [rcx], 0xfffffffe
0x1804bad64 488d15252fb9ff       lea rdx, qword [0x18004dc90]
0x1804bad6b 4883c108             add rcx, 0x08
0x1804bad6f ff150b47deff         call qword [0x18029f480]
0x1804bad75 488d0596ffffff       lea rax, qword [0x1804bad12]
0x1804bad7c 4883c428             add rsp, 0x28
0x1804bad80 c3                   ret
0x1804bad81 cc                   int3
0x1804bad82 cc                   int3
0x1804bad83 cc                   int3
0x1804bad84 cc                   int3
0x1804bad85 cc                   int3
0x1804bad86 cc                   int3
0x1804bad87 cc                   int3
0x1804bad88 cc                   int3
0x1804bad89 cc                   int3
0x1804bad8a cc                   int3
0x1804bad8b cc                   int3
0x1804bad8c cc                   int3
0x1804bad8d cc                   int3
0x1804bad8e cc                   int3
0x1804bad8f cc                   int3
0x1804bad90 53                   push rbx
0x1804bad91 57                   push rdi
0x1804bad92 4881ec88000000       sub rsp, 0x88
0x1804bad99 33c0                 xor eax, eax
0x1804bad9b 4889442440           mov qword [rsp+0x40], rax
0x1804bada0 4889442448           mov qword [rsp+0x48], rax
0x1804bada5 4889442450           mov qword [rsp+0x50], rax
0x1804badaa 4889442468           mov qword [rsp+0x68], rax
0x1804badaf 4889442470           mov qword [rsp+0x70], rax
0x1804badb4 33ff                 xor edi, edi
0x1804badb6 4889442420           mov qword [rsp+0x20], rax
0x1804badbb 4889442428           mov qword [rsp+0x28], rax
0x1804badc0 48894c2458           mov qword [rsp+0x58], rcx
0x1804badc5 4889542460           mov qword [rsp+0x60], rdx
0x1804badca 488b15a7b0deff       mov rdx, qword [0x1802a5e78]
0x1804badd1 488bc2               mov rax, rdx
0x1804badd4 4883c2f0             add rdx, 0xfffffffffffffff0
0x1804badd8 ff156ad6deff         call qword [sym.imp.mrt100_app.dll_RhpCheckCctor2]
0x1804badde ff15a462deff         call qword [0x1802a1088]
0x1804bade4 84c0                 test al, al
0x1804bade6 751e                 jnz 0x1804bae06
0x1804bade8 488b15c1b1deff       mov rdx, qword [0x1802a5fb0]
0x1804badef 488bc2               mov rax, rdx
0x1804badf2 4883c2f0             add rdx, 0xfffffffffffffff0
0x1804badf6 ff154cd6deff         call qword [sym.imp.mrt100_app.dll_RhpCheckCctor2]
0x1804badfc 40387804             cmp byte [rax+0x04], dil
0x1804bae00 7504                 jnz 0x1804bae06
0x1804bae02 33db                 xor ebx, ebx
0x1804bae04 eb21                 jmp 0x1804bae27
0x1804bae06 488bdf               mov rbx, rdi
0x1804bae09 4885ff               test rdi, rdi
0x1804bae0c 7519                 jnz 0x1804bae27
0x1804bae0e 488d0d63d3bbff       lea rcx, qword [0x180078178]
0x1804bae15 ff1535d6deff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804bae1b 488bd8               mov rbx, rax
0x1804bae1e 488bc8               mov rcx, rax
0x1804bae21 ff15c963deff         call qword [0x1802a11f0]
0x1804bae27 488bcb               mov rcx, rbx
0x1804bae2a 488d1547d3bbff       lea rdx, qword [0x180078178]
0x1804bae31 ff15c1d6deff         call qword [sym.imp.mrt100_app.dll_RhTypeCast_CheckCastClass]
0x1804bae37 488bd8               mov rbx, rax
0x1804bae3a 4885c0               test rax, rax
0x1804bae3d 740c                 jz 0x1804bae4b
0x1804bae3f 403838               cmp byte [rax], dil
0x1804bae42 488bc8               mov rcx, rax
0x1804bae45 ff150564deff         call qword [0x1802a1250]
0x1804bae4b 48897c2448           mov qword [rsp+0x48], rdi
0x1804bae50 48895c2450           mov qword [rsp+0x50], rbx
0x1804bae55 c7442440ffffffff     mov dword [rsp+0x40], 0xffffffff
0x1804bae5d 33c0                 xor eax, eax
0x1804bae5f 4889442420           mov qword [rsp+0x20], rax
0x1804bae64 4889442428           mov qword [rsp+0x28], rax
0x1804bae69 488d4c2420           lea rcx, qword [rsp+0x20]
0x1804bae6e ff15f458deff         call qword [0x1802a0768]
0x1804bae74 488d4c2440           lea rcx, qword [rsp+0x40]
0x1804bae79 e842000000           call 0x1804baec0
0x1804bae7e 488d4c2420           lea rcx, qword [rsp+0x20]
0x1804bae83 ff15c758deff         call qword [0x1802a0750]
0x1804bae89 488b5c2450           mov rbx, qword [rsp+0x50]
0x1804bae8e 4885db               test rbx, rbx
0x1804bae91 7519                 jnz 0x1804baeac
0x1804bae93 488d0dded2bbff       lea rcx, qword [0x180078178]
0x1804bae9a ff15b0d5deff         call qword [sym.imp.mrt100_app.dll_RhpNewFast]
0x1804baea0 488bd8               mov rbx, rax
0x1804baea3 488bc8               mov rcx, rax
0x1804baea6 ff154463deff         call qword [0x1802a11f0]
0x1804baeac 488bc3               mov rax, rbx
0x1804baeaf 4881c488000000       add rsp, 0x88
0x1804baeb6 5f                   pop rdi
0x1804baeb7 5b                   pop rbx
0x1804baeb8 c3                   ret
0x1804baeb9 cc                   int3
0x1804baeba cc                   int3
0x1804baebb cc                   int3
0x1804baebc cc                   int3
0x1804baebd cc                   int3
0x1804baebe cc                   int3
0x1804baebf cc                   int3
0x1804baec0 55                   push rbp
0x1804baec1 53                   push rbx
0x1804baec2 56                   push rsi
0x1804baec3 57                   push rdi
0x1804baec4 4881ec88000000       sub rsp, 0x88
0x1804baecb 488d6c2420           lea rbp, qword [rsp+0x20]
0x1804baed0 48898d90000000       mov qword [rbp+0x90], rcx
0x1804baed7 488bf9               mov rdi, rcx
0x1804baeda 33c0                 xor eax, eax
0x1804baedc 48894518             mov qword [rbp+0x18], rax
0x1804baee0 48894520             mov qword [rbp+0x20], rax
0x1804baee4 48894528             mov qword [rbp+0x28], rax
0x1804baee8 48894530             mov qword [rbp+0x30], rax
0x1804baeec 48894538             mov qword [rbp+0x38], rax
0x1804baef0 48894548             mov qword [rbp+0x48], rax
0x1804baef4 33f6                 xor esi, esi
0x1804baef6 48897510             mov qword [rbp+0x10], rsi
0x1804baefa 48897500             mov qword [rbp], rsi
0x1804baefe 90                   nop
0x1804baeff 48897508             mov qword [rbp+0x08], rsi
0x1804baf03 3931                 cmp dword [rcx], esi
0x1804baf05 0f849b000000         jz 0x1804bafa6
0x1804baf0b 488b4918             mov rcx, qword [rcx+0x18]
0x1804baf0f 403831               cmp byte [rcx], sil
0x1804baf12 8d5001               lea edx, qword [rax+0x01]
0x1804baf15 4c8d1524a7e4ff       lea r10, qword [0x180305640]
0x1804baf1c 41ff12               call qword [r10]
0x1804baf1f 488bd8               mov rbx, rax
0x1804baf22 ff152854deff         call qword [0x1802a0350]
0x1804baf28 488d0d0146c5ff       lea rcx, qword [0x18010f530]
0x1804baf2f 4c8bc0               mov r8, rax
0x1804baf32 488bd3               mov rdx, rbx
0x1804baf35 e8362ffcff           call 0x18047de70
0x1804baf3a 403830               cmp byte [rax], sil
0x1804baf3d 33c9                 xor ecx, ecx
0x1804baf3f 48894d38             mov qword [rbp+0x38], rcx
0x1804baf43 48894d40             mov qword [rbp+0x40], rcx
0x1804baf47 4533c0               xor r8d, r8d
0x1804baf4a 4c894548             mov qword [rbp+0x48], r8
0x1804baf4e 48894528             mov qword [rbp+0x28], rax
0x1804baf52 4c894530             mov qword [rbp+0x30], r8
0x1804baf56 48894518             mov qword [rbp+0x18], rax
0x1804baf5a 4c894520             mov qword [rbp+0x20], r8
0x1804baf5e 3808                 cmp byte [rax], cl
0x1804baf60 488bc8               mov rcx, rax
0x1804baf63 ff151f63deff         call qword [0x1802a1288]
0x1804baf69 84c0                 test al, al
0x1804baf6b 7533                 jnz 0x1804bafa0
0x1804baf6d 8937                 mov dword [rdi], esi
0x1804baf6f 488d4f28             lea rcx, qword [rdi+0x28]
0x1804baf73 488b5518             mov rdx, qword [rbp+0x18]
0x1804baf77 ff150bd5deff         call qword [sym.imp.mrt100_app.dll_RhpCheckedAssignRefEDX]
0x1804baf7d f20f104520           movsd xmm0, qword [rbp+0x20]
0x1804baf82 f20f114730           movsd qword [rdi+0x30], xmm0
0x1804baf87 488d159a22c5ff       lea rdx, qword [0x18010d228]
0x1804baf8e 488d4f08             lea rcx, qword [rdi+0x08]
0x1804baf92 4c8bcf               mov r9, rdi
0x1804baf95 4c8d4518             lea r8, qword [rbp+0x18]
0x1804baf99 e802f5fbff           call 0x18047a4a0
0x1804baf9e eb7a                 jmp 0x1804bb01a
0x1804bafa0 488b4d18             mov rcx, qword [rbp+0x18]
0x1804bafa4 eb20                 jmp 0x1804bafc6
0x1804bafa6 488b4928             mov rcx, qword [rcx+0x28]
0x1804bafaa 48894d18             mov qword [rbp+0x18], rcx
0x1804bafae 488b4730             mov rax, qword [rdi+0x30]
0x1804bafb2 48894520             mov qword [rbp+0x20], rax
0x1804bafb6 33c0                 xor eax, eax
0x1804bafb8 48894728             mov qword [rdi+0x28], rax
0x1804bafbc 48894730             mov qword [rdi+0x30], rax
0x1804bafc0 c707ffffffff         mov dword [rdi], 0xffffffff
0x1804bafc6 ff15e44adeff         call qword [0x18029fab0]
0x1804bafcc 488b4518             mov rax, qword [rbp+0x18]
0x1804bafd0 33c9                 xor ecx, ecx
0x1804bafd2 48894d18             mov qword [rbp+0x18], rcx
0x1804bafd6 48894d20             mov qword [rbp+0x20], rcx
0x1804bafda 488b4848             mov rcx, qword [rax+0x48]
0x1804bafde e8bdaeffff           call 0x1804b5ea0
0x1804bafe3 488bd8               mov rbx, rax
0x1804bafe6 488b5720             mov rdx, qword [rdi+0x20]
0x1804bafea 488bc8               mov rcx, rax
0x1804bafed 488b01               mov rax, qword [rcx]
0x1804baff0 48ff5060             call qword [rax+0x60]
0x1804baff4 48895d00             mov qword [rbp], rbx
0x1804baff8 488b8d90000000       mov rcx, qword [rbp+0x90]
0x1804bafff c701feffffff         mov dword [rcx], 0xfffffffe
0x1804bb005 488d15842cb9ff       lea rdx, qword [0x18004dc90]
0x1804bb00c 4883c108             add rcx, 0x08
0x1804bb010 4c8b4500             mov r8, qword [rbp]
0x1804bb014 ff155e44deff         call qword [0x18029f478]
0x1804bb01a 90                   nop
0x1804bb01b 488d6568             lea rsp, qword [rbp+0x68]
0x1804bb01f 5f                   pop rdi
0x1804bb020 5e                   pop rsi
0x1804bb021 5b                   pop rbx
0x1804bb022 5d                   pop rbp
0x1804bb023 c3                   ret
0x1804bb024 4883ec28             sub rsp, 0x28
0x1804bb028 48894d08             mov qword [rbp+0x08], rcx
0x1804bb02c e8dfedffff           call 0x1804b9e10
0x1804bb031 803800               cmp byte [rax], 0x00
0x1804bb034 488bc8               mov rcx, rax
0x1804bb037 ff15339cdeff         call qword [0x1802a4c70]
0x1804bb03d 48c7450000000000     mov qword [rbp], 0x00
0x1804bb045 488d05acffffff       lea rax, qword [0x1804baff8]
0x1804bb04c 4883c428             add rsp, 0x28
0x1804bb050 c3                   ret
0x1804bb051 4883ec28             sub rsp, 0x28
0x1804bb055 4c8bc1               mov r8, rcx
0x1804bb058 48894d10             mov qword [rbp+0x10], rcx
0x1804bb05c 488b8d90000000       mov rcx, qword [rbp+0x90]
0x1804bb063 c701feffffff         mov dword [rcx], 0xfffffffe
0x1804bb069 488d15202cb9ff       lea rdx, qword [0x18004dc90]
0x1804bb070 4883c108             add rcx, 0x08
0x1804bb074 ff150644deff         call qword [0x18029f480]
0x1804bb07a 488d0599ffffff       lea rax, qword [0x1804bb01a]
0x1804bb081 4883c428             add rsp, 0x28
0x1804bb085 c3                   ret
0x1804bb086 cc                   int3
0x1804bb087 cc                   int3
0x1804bb088 cc                   int3
0x1804bb089 cc                   int3
0x1804bb08a cc                   int3
0x1804bb08b cc                   int3
0x1804bb08c cc                   int3
0x1804bb08d cc                   int3
0x1804bb08e cc                   int3
0x1804bb08f cc                   int3
0x1804bb090 53                   push rbx
0x1804bb091 56                   push rsi
0x1804bb092 57                   push rdi
0x1804bb093 4883ec40             sub rsp, 0x40
0x1804bb097 498bf8               mov rdi, r8
0x1804bb09a 488bf2               mov rsi, rdx
0x1804bb09d 488bd9               mov rbx, rcx
0x1804bb0a0 33c0                 xor eax, eax
0x1804bb0a2 ff150044deff         call qword [0x18029f4a8]
0x1804bb0a8 488b03               mov rax, qword [rbx]
0x1804bb0ab 4889442430           mov qword [rsp+0x30], rax
0x1804bb0b0 488b4308             mov rax, qword [rbx+0x08]
0x1804bb0b4 4889442438           mov qword [rsp+0x38], rax
0x1804bb0b9 488d4c2430           lea rcx, qword [rsp+0x30]
0x1804bb0be ff15f45fdeff         call qword [0x1802a10b8]
0x1804bb0c4 4c8d0df5a7b4ff       lea r9, qword [0x1800058c0]
0x1804bb0cb 488b0d6645deff       mov rcx, qword [0x18029f638]
0x1804bb0d2 4c8bc7               mov r8, rdi
0x1804bb0d5 480fbae101           bt rcx, 0x01
0x1804bb0da 7327                 jnb 0x1804bb103
0x1804bb0dc 488b155545deff       mov rdx, qword [0x18029f638]
0x1804bb0e3 488b4a06             mov rcx, qword [rdx+0x06]
0x1804bb0e7 4c8b52fe             mov r10, qword [rdx-0x02]
0x1804bb0eb 4889442428           mov qword [rsp+0x28], rax
0x1804bb0f0 4c894c2420           mov qword [rsp+0x20], r9
0x1804bb0f5 4c8bcf               mov r9, rdi
0x1804bb0f8 488bd3               mov rdx, rbx
0x1804bb0fb 488b09               mov rcx, qword [rcx]
0x1804bb0fe 49ffd2               call r10
