
Sub GEP_Moagem_1()

'Tip:
' 1. Use the <CTRL+SPACE> or <CTRL+I> shortcut to open a list of all objects and functions
' 2. Write the code using the HMI Runtime object.
'  Example: HmiRuntime.Screens("Screen_1").
' 3. Use the <CTRL+J> shortcut to create an object reference.
'Write the code as of this position:

Dim DataTime
Dim folder_y_m, folder_day, Z1, filepath, var, header ,filepath_C
Dim fso, fso1, fso2, fso3  
Dim H, Min, S, d, Mon, Y
Dim val(115)
Dim i 

val(10)= SmartTags("DB_Motores_Comm_Z1M01M1_I_Rodando") 'Z1M01M1_SIN_FUN_FLOAT - Sinaliza funcionando motor principal Do moinho (1 - Ligado e 2 - Desligado)
val(11)= SmartTags("Z1M01_PRODUTO") 'Z1M01_PRODUTO - Seleção de produto produzido ( 1 - CPIII 40 RS, 2 - CPII E40, 3 - Ensacado)
val(12)= SmartTags("Z1A01_POR_VAZ") 'Z1A01_POR_VAZ - Porcentagem de vazão da balança de calcário
val(13)= SmartTags("Z1A01_VAZ_DES") 'Z1A01_VAZ_DES - Vazão desejada da balança de calcário
val(14)= SmartTags("Z1A01_UMI_MAT") 'Z1A01_UMI_MAT - Umidade do material da balança de calcário
val(15)= SmartTags("Z1A01_VAZ_UMI") 'Z1A01_VAZ_UMI - Vazão Do material base umida na balança de calcário
val(16)= SmartTags("Z1A01_VAZ_SEC") 'Z1A01_VAZ_SEC - Vazão do material base seca na balança de calcário
val(17)= SmartTags("Z1A01_TOT_UMI_") 'Z1A01_TOT_UMI - Totalizador do material base umida na balança de calcário
val(18)= SmartTags("Z1A01_TOT_SEC") 'Z1A01_TOT_SEC - Totalizador do material base seca na balança de calcário 
val(19)= SmartTags("Z1A02_POR_VAZ") 'Z1A02_POR_VAZ - Porcentagem de vazão da balança de gesso
val(20)= SmartTags("Z1A02_VAZ_DES") 'Z1A02_VAZ_DES - Vazão desejada da balança de gesso
val(21)= SmartTags("Z1A02_UMI_MAT") 'Z1A02_UMI_MAT - Umidade do material da balança de gesso
val(22)= SmartTags("Z1A02_VAZ_UMI") 'Z1A02_VAZ_UMI - Vazão do material base umida na balança de gesso
val(23)= SmartTags("Z1A02_VAZ_SEC") 'Z1A02_VAZ_SEC - Vazão do material base seca na balança de gesso
val(24)= SmartTags("Z1A02_TOT_UMI_") 'Z1A02_TOT_UMI - Totalizador do material base umida na balança de gesso
val(25)= SmartTags("Z1A02_TOT_SEC") 'Z1A02_TOT_SEC - Totalizador do material base seca na balança de gesso
val(26)= SmartTags("Z1A03_POR_VAZ") 'Z1A03_POR_VAZ - Porcentagem de vazão da balança de gesso
val(27)= SmartTags("Z1A03_VAZ_DES") 'Z1A03_VAZ_DES - Vazão desejada da balança de gesso
val(28)= SmartTags("Z1A03_UMI_MAT") 'Z1A03_UMI_MAT - Umidade do material da balança de gesso
val(29)= SmartTags("Z1A03_VAZ_UMI") 'Z1A03_VAZ_UMI - Vazão do material base umida na balança de gesso
val(30)= SmartTags("Z1A03_VAZ_SEC") 'Z1A03_VAZ_SEC - Vazão do material base seca na balança de gesso
val(31)= SmartTags("Z1A03_TOT_UMI_") 'Z1A03_TOT_UMI - Totalizador do material base umida na balança de escória
val(32)= SmartTags("Z1A03_TOT_SEC") 'Z1A03_TOT_SEC - Totalizador do material base seca na balança de clinquer
val(33)= SmartTags("Z1A04_POR_VAZ") 'Z1A04_POR_VAZ - Porcentagem de vazão da balança de gesso
val(34)= SmartTags("Z1A04_VAZ_DES") 'Z1A04_VAZ_DES - Vazão desejada da balança de escória
val(35)= SmartTags("Z1A04_UMI_MAT") 'Z1A04_UMI_MAT - Umidade do material da balança de escória
val(36)= SmartTags("Z1A04_VAZ_UMI") 'Z1A04_VAZ_UMI - Vazão do material base umida na balança de escória
val(37)= SmartTags("Z1A04_VAZ_SEC") 'Z1A04_VAZ_SEC - Vazão do material base seca na balança de escória
val(38)= SmartTags("Z1A04_TOT_UMI_") 'Z1A04_TOT_UMI - Totalizador do material base umida na balança de escória
val(39)= SmartTags("Z1A04_TOT_SEC") 'Z1A04_TOT_SEC - Totalizador do material base seca na balança de escória
val(40)= SmartTags("BAL_DOS_SOM_TOT_POR_M1") 'BAL_DOS_SOM_TOT_POR - Soma total porcentagem das balanças dosadoras
val(41)= SmartTags("BAL_DOS_SOM_TOT_VAZ_UMI_M1") 'BAL_DOS_SOM_TOT_VAZ_UMI - Soma total vazão umida das balanças dosadoras
val(42)= SmartTags("BAL_DOS_SOM_TOT_VAZ_SEC_M1") 'BAL_DOS_SOM_TOT_VAZ_SEC - Soma total vazão seca das balanças dosadoras
val(43)= SmartTags("Z1J03C1_SET_POI_PID") 'Z1J03C1_SET_POI_PID - Set-point corrente elevador retorno de controle do PID 
val(44)= SmartTags("VAR_PID_PRO_MOI") 'SET_POI_PRO_MOI - Set-point de produção do moinho
val(45)= SmartTags("SET_POI_MAN_PRO_MOI_M1") 'SET_POI_MAN_PRO_MOI - Set-point manual da produção do moinho
val(46)= SmartTags("LIM_MAX_PRO_MOI") 'LIM_MAX_PRO_MOI - Limite máximo de produção do moinho
val(47)= SmartTags("BAL_DOS_SOM_TOT_VAZ_UMI_M1") 'BAL_DOS_SOM_TOT_VAZ_UMI - Soma total vazão umida das balanças dosadoras
val(48)= SmartTags("SOMA_TOT_CONSUMO") 'SOMA_TOT_CONSUMO - Soma do totalizador consumo moagem 1
val(49)= SmartTags("TOT_INICIAL_BALANCAS") 'TOT_INICIAL_BALANCAS - Totalizador inicial das balanças moagem 1
val(50)= SmartTags("TOT_INICIAL_CONSUMO_") 'TOT_INICIAL_CONSUMO - Totalizador inicial consumo moagem 1
val(51)= SmartTags("Z1M01M1.Sts_Hora")' Z1M01M1_TOT_HOR_FUN - Totalizador funcionamento (horas) Do motor principal Do moinho
val(52)= SmartTags("Z1M01M1_Minutos") 'Z1M01M1_TOT_MIN_FUN - Totalizador funcionamento (minutos) do motor principal do moinho
val(53)= SmartTags("Z1M01M1_Segundos")' Z1M01M1_TOT_HOR_FUN - Totalizador funcionamento (horas) Do motor principal Do moinho
val(54)= SmartTags("Z1J01T1.STS_O_Sinal_EU")' Z1J01T1_LEI_TEMP - Leitura temperatura de saída do moinho
val(55)= SmartTags("Z1M01P1_LEI_PRESS.STS_O_Sinal_EU") ' Z1M01P1_LEI_PRES - Leitura pressão entrada Do moinho 1
val(56)= SmartTags("Z1P01P1_LEI_PRES.STS_O_Sinal_EU") ' Z1P01P1_LEI_PRES - Leitura pressão entrada Do filtro de processo
val(57)= SmartTags("Z1P01P2_LEI_PRES.STS_O_Sinal_EU") ' Z1P01P2_LEI_PRES - Leitura pressão saída Do filtro de processo
val(58)= SmartTags("Z1P01T1_LEI_TEMP.STS_O_Sinal_EU") ' Z1P01T1_LEI_TEMP - Leitura temperatura entrada filtro de processo
val(59)= SmartTags("Z1S01T2_LEI_TEMP.STS_O_Sinal_EU") ' Z1S01T2_LEI_TEMP - Leitura temperatura da saída Do moinho para o separador
val(60)= SmartTags("Z1S01P1_LEI_PRES.STS_O_Sinal_EU") ' Z1S01P1_LEI_PRES - Leitura pressão da saída Do moinho para o separador
val(61)= SmartTags("Z1L01.Sts_Pos") ' Z1L01_LEI_ABER - Leitura abertura válvula ar primário Do separador
val(62)= SmartTags("Z1P01D1.STS_O_Sinal_EU") ' Z1P01D1_LEI_PRE_DIF - Leitura pressão diferencial Do filtro de processo
val(63)= SmartTags("Z1M01M1_TOT_CONS_ENE")' Z1M01M1_TOT_CONS_ENE - Totalizador de Consumo de Energia Do Motor Do moinho
val(64)= SmartTags("CCM1_TOT_CONS_ENE")' CCM1_TOT_CONS_ENE - Totalizador de Consumo de Energia Do CCM 1
val(65)= SmartTags("CCM1.LEI_TEN_L1_NEU")' CCM1_LEI_TEN_L1_NEU - Leitura tensão entre L1 e neutro Do CCM 1
val(66)= SmartTags("CCM1.LEI_TEN_L2_NEU")' CCM1_LEI_TEN_L2_NEU - Leitura tensão entre L2 e neutro Do CCM 1
val(67)= SmartTags("CCM1.LEI_TEN_L3_NEU")' CCM1_LEI_TEN_L3_NEU - Leitura tensão entre L3 e neutro Do CCM 1 
val(68)= SmartTags("CCM1.LEI_TEN_L1_L2")' CCM1_LEI_TEN_L1_L2 - Leitura tensão entre L1 e L2 Do CCM 1
val(69)= SmartTags("CCM1.LEI_TEN_L2_L3")' CCM1_LEI_TEN_L2_L3 - Leitura tensão entre L2 e L3 Do CCM 1
val(70)= SmartTags("CCM1.LEI_TEN_L1_L3")' CCM1_LEI_TEN_L1_L3 - Leitura tensão entre L1 e L3 Do CCM 1
val(71)= SmartTags("CCM1.LEI_COR_L1")' CCM1_LEI_COR_L1 - Leitura corrente em L1 Do CCM 1
val(72)= SmartTags("CCM1.LEI_COR_L2")' CCM1_LEI_COR_L2 - Leitura corrente em L2 Do CCM 1
val(73)= SmartTags("CCM1.LEI_COR_L3")' CCM1_LEI_COR_L3 - Leitura corrente em L3 Do CCM 1
val(74)= SmartTags("CCM1.LEI_POT_ATI_TOT")' CCM1_LEI_POT_ATI_TOT - Leitura potência ativa total Do CCM 1
val(75)= SmartTags("CCM1.LEI_POT_REA_TOT")' CCM1_LEI_POT_REA_TOT - Leitura potência reativa total Do CCM 1
val(76)= SmartTags("CCM1.LEI_DEM_POT_ATI")' CCM1_LEI_DEM_POT_ATI - Leitura demanda potência ativa Do CCM 1
val(77)= SmartTags("CCM1.LEI_FAT_POT_TOT")' CCM1_LEI_FAT_POT_TOT - Leitura fator de potência total Do CCM 1
val(78)= SmartTags("CCM1_LEI_ENE_CONS")' CCM1_LEI_ENE_CONS - Leitura Energia consumida Do CCM 2
val(79)= SmartTags("Z1M01_SEL_SILO")' Z1M01_SEL_SILO - Seleção de produção Do moinho (1 - Silo 1, 2 - Silo 2, 3 - Silo 3 e 4 Silo 4)
val(80)= SmartTags("Z1M01M1_ENERG.LEI_TEN_L1_NEU")' Z1M01M1_LEI_TEN_L1_NEU - Leitura tensão entre L1 e neutro Do Motor principal Do moinho
val(81)= SmartTags("Z1M01M1_ENERG.LEI_TEN_L2_NEU")' Z1M01M1_LEI_TEN_L2_NEU - Leitura tensão entre L2 e neutro Do Motor principal Do moinho
val(82)= SmartTags("Z1M01M1_ENERG.LEI_TEN_L3_NEU")' Z1M01M1_LEI_TEN_L3_NEU - Leitura tensão entre L3 e neutro Do Motor principal Do moinho
val(83)= SmartTags("Z1M01M1_ENERG.LEI_TEN_L1_L2")' Z1M01M1_LEI_TEN_L1_L2 - Leitura tensão entre L1 e L2 Do Motor principal Do moinho
val(84)= SmartTags("Z1M01M1_ENERG.LEI_TEN_L2_L3")' Z1M01M1_LEI_TEN_L2_L3 - Leitura tensão entre L2 e L3 Do Motor principal Do moinho
val(85)= SmartTags("Z1M01M1_ENERG.LEI_TEN_L1_L3")' Z1M01M1_LEI_TEN_L1_L3 - Leitura tensão entre L1 e L3 Do Motor principal Do moinho
val(86)= SmartTags("Z1M01M1_ENERG.LEI_COR_L1")' Z1M01M1_LEI_COR_L1 - Leitura corrente em L1 Do Motor principal Do moinho
val(87)= SmartTags("Z1M01M1_ENERG.LEI_COR_L2")' Z1M01M1_LEI_COR_L2 - Leitura corrente em L2 Do Motor principal Do moinho
val(88)= SmartTags("Z1M01M1_ENERG.LEI_COR_L3")' Z1M01M1_LEI_COR_L3 - Leitura corrente em L3 Do Motor principal Do moinho
val(89)= SmartTags("Z1M01M1_ENERG.LEI_POT_ATI_TOT")' Z1M01M1_LEI_POT_ATI_TOT - Leitura potência ativa total Do Motor principal Do moinho
val(90)= SmartTags("Z1M01M1_ENERG.LEI_POT_REA_TOT")' Z1M01M1_LEI_POT_REA_TOT - Leitura potência reativa total Do Motor principal Do moinho
val(91)= SmartTags("Z1M01M1_ENERG.LEI_DEM_POT_ATI")' Z1M01M1_LEI_DEM_POT_ATI - Leitura demanda potência ativa Do Motor principal Do moinho
val(92)= SmartTags("Z1M01M1_ENERG.LEI_FAT_POT_TOT")' Z1M01M1_LEI_FAT_POT_TOT - Leitura fator de potência total Do Motor principal Do moinho
val(93)= SmartTags("Z1M01M1_LEI_ENE_CONS")' Z1M01M1_LEI_ENE_CONS - Leitura Energia consumida Do Motor principal Do moinho
val(94)= SmartTags("Z1M01M1.Sts_Corrente_Perc")' Z1M01M1_LEI_COR_POR - Leitura corrente em Porcentagem Motor principal moinho
val(95)= SmartTags("Z1J12_MC1.Sts.currentPerc")' Z1J12_LEI_COR_POR - Leitura corrente em Porcentagem elevador de processo
val(96)= SmartTags("Z1J12_MC1.Sts.current")' Z1J12_LEI_COR_AMP - Leitura corrente em amperes elevador de processo
val(97)= SmartTags("Z1J12_MC1.Cmd.velRef")' Z1J12_SET_VEL - Set_point velocidade ventilador filtro de processo
val(98)= SmartTags("Z1J12_MC1.Sts.hz")' Z1J12_IND_VEL_FRE - Indicação velocidade em frequencia elevador de processo
val(99)= SmartTags("Z1J12_MC1.Sts.rpm")' Z1J12_IND_VEL_RPM - Indicação velocidade em RPM elevador de processo
val(100)= SmartTags("Z1P04.Sts.currentPerc")' Z1P04_LEI_COR_POR - Leitura corrente em Porcentagem ventilador filtro de processo
val(101)= SmartTags("Z1P04.Sts.current")' Z1P04_LEI_COR_AMP - Leitura corrente em amperes ventilador filtro de processo
val(102)= SmartTags("Z1P04.Cmd.velRef")' Z1P04_SET_VEL - Set_point velocidade elevador de processo
val(103)= SmartTags("Z1P04.Sts.hz")' Z1P04_IND_VEL_FRE - Indicação velocidade em frequencia ventilador filtro de processo
val(104)= SmartTags("Z1P04.Sts.rpm")' Z1P04_IND_VEL_RPM - Indicação velocidade em RPM ventilador filtro de processo
val(105)= SmartTags("Z1S01.Sts.currentPerc")' Z1S01_LEI_COR_POR - Leitura corrente em Porcentagem separador dinâmico
val(106)= SmartTags("Z1S01.Sts.current")' Z1S01_LEI_COR_AMP - Leitura corrente em amperes separador dinâmico
val(107)= SmartTags("Z1S01.Cmd.velRef")' Z1S01_SET_VEL - Set_point velocidade separador dinâmico
val(108)= SmartTags("Z1S01.Sts.hz")' Z1S01_IND_VEL_FRE - Indicação velocidade em frequencia separador dinâmico
val(109)= SmartTags("Z1S01.Sts.rpm")' Z1S01_IND_VEL_RPM - Indicação velocidade em RPM separador dinâmico
val(110)= SmartTags("Z1J03.Sts.currentPerc")' Z1J03_LEI_COR_POR - Leitura corrente em Porcentagem elevador de retorno
val(111)= SmartTags("Z1J03.Sts.current")' Z1J03_LEI_COR_AMP - Leitura corrente em amperes elevador de retorno
val(112)= SmartTags("Z1J03.Cmd.velRef")' Z1J03_SET_VEL - Set_point velocidade elevador de retorno
val(113)=SmartTags("Z1J03.Sts.hz")' Z1J03_IND_VEL_FRE - Indicação velocidade em frequencia elevador de retorno
val(114)= SmartTags("Z1J03.Sts.rpm")' Z1J03_IND_VEL_RPM - Indicação velocidade em RPM elevador de retorno
val(115)= SmartTags("Z1L01.Cmd_SP_Pos")' Z1L01_SET_ABER - Set-point abertura válvula ar primário Do separador

'Formarta e arredunda os valores 
For i = 10 To 117
	
        If i < 116 Then
     val(i) =   FormatNumber(val(i),2,True,False,False)
       
           End If 
Next 

Mon = Right("00" & Month (Now()),2)
Y = Year(Date())
d = Right("00" & Day (Now()),2)
H = Right("00"& Hour(Time()),2)
Min = Right("00"& Minute(Time()),2)
S = Second(Time())
  
DataTime= d & Mon & Y

Z1 = DataTime & ".Z01"
'Create Folder year_month
'Set fso = CreateObject("Scripting.FileSystemObject")
'folder_y_m = "Z:\RELATORIOS\" & Y & "_" & Mon
'If Not fso.FolderExists(folder_y_m) Then
' fso.CreateFolder (folder_y_m)
'End If
'Create Folder day
'Set fso1 = CreateObject("Scripting.FileSystemObject")
'folder_day = folder_y_m & "\" & d
'If Not fso1.FolderExists(folder_day) Then
' fso1.CreateFolder (folder_day)
'End If
'Create File Excel


Set fso2 = CreateObject("Scripting.FileSystemObject")
filepath_C = "C:\\Relatorios" & folder_day & "\" & Z1


'Salva no pasta c:\\Relatorios

If Not fso2.FileExists(filepath_C) Then
 fso2.CreateTextFile(filepath_C)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath_C,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath_C,8,1)
fso3.WriteLine Y & Mon & d & H & Min &  ";" & val(10) & ";" & val(11) & ";" & val(12) & ";" & val(13) & ";" & val(14) & ";" & val(15) & ";" & val(16) & ";" & val(17) & ";" & val(18) & ";" & val(19) & ";" & val(20) & ";" & val(21) & ";" & val(22) & ";" & val(23) & ";" & val(24) & ";" & val(25) & ";" & val(26) & ";" & val(27) & ";" & val(28) & ";" & val(29) & ";" & val(30) & ";" & val(31) & ";" & val(32) & ";" & val(33) & ";" & val(34) & ";" & val(35) & ";" & val(36) & ";" & val(37) & ";" & val(38) & ";" & val(39) & ";" & val(40) & ";" & val(41) & ";" & val(42) & ";" & val(43) & ";" & val(44) & ";" & val(45) & ";" & val(46) & ";" & val(47) & ";" & val(48) & ";" & val(49) & ";" & val(50) & ";" & val(51) & ";" & val(52) & ";" & val(53) & ";" & val(54) & ";" & val(55) & ";" & val(56) & ";" & val(57) & ";" & val(58) & ";" & val(59) & ";" & val(60) & ";" & val(61) & ";" & val(62) & ";" & val(63) & ";" & val(64) & ";" & val(65) & ";" & val(66) & ";" & val(67) & ";" & val(68) & ";" & val(69) & ";" & val(70) & ";" & val(71) & ";" & val(72) & ";" & val(73) & ";" & val(74) & ";" & val(75) & ";" & val(76) & ";" & val(77) & ";" & val(78) & ";" & val(79) & ";" & val(80) & ";" & val(81) & ";" & val(82) & ";" & val(83) & ";" & val(84) & ";" & val(85) & ";" & val(86) & ";" & val(87) & ";" & val(88) & ";" & val(89) & ";" & val(90) & ";" & val(91) & ";" & val(92) & ";" & val(92) & ";" & val(94) & ";" & val(95) & ";" & val(96) & ";" & val(97) & ";" & val(98) & ";" & val(99) & ";" & val(100) & ";" & val(101) & ";" & val(102) & ";" & val(103) & ";" & val(104) & ";" & val(105) & ";" & val(106) & ";" & val(107) & ";" & val(108) & ";" & val(109) & ";" & val(110) & ";" & val(111) & ";" & val(112) & ";" & val(113) & ";" & val(114) & ";" & val(115) 
fso3.Close


'Salva no pasta z:\\
filepath = "Z:\\" & folder_day & "\" & Z1
If Not fso2.FileExists(filepath) Then
 fso2.CreateTextFile(filepath)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath,8,1)
fso3.WriteLine Y & Mon & d & H & Min &  ";" & val(10) & ";" & val(11) & ";" & val(12) & ";" & val(13) & ";" & val(14) & ";" & val(15) & ";" & val(16) & ";" & val(17) & ";" & val(18) & ";" & val(19) & ";" & val(20) & ";" & val(21) & ";" & val(22) & ";" & val(23) & ";" & val(24) & ";" & val(25) & ";" & val(26) & ";" & val(27) & ";" & val(28) & ";" & val(29) & ";" & val(30) & ";" & val(31) & ";" & val(32) & ";" & val(33) & ";" & val(34) & ";" & val(35) & ";" & val(36) & ";" & val(37) & ";" & val(38) & ";" & val(39) & ";" & val(40) & ";" & val(41) & ";" & val(42) & ";" & val(43) & ";" & val(44) & ";" & val(45) & ";" & val(46) & ";" & val(47) & ";" & val(48) & ";" & val(49) & ";" & val(50) & ";" & val(51) & ";" & val(52) & ";" & val(53) & ";" & val(54) & ";" & val(55) & ";" & val(56) & ";" & val(57) & ";" & val(58) & ";" & val(59) & ";" & val(60) & ";" & val(61) & ";" & val(62) & ";" & val(63) & ";" & val(64) & ";" & val(65) & ";" & val(66) & ";" & val(67) & ";" & val(68) & ";" & val(69) & ";" & val(70) & ";" & val(71) & ";" & val(72) & ";" & val(73) & ";" & val(74) & ";" & val(75) & ";" & val(76) & ";" & val(77) & ";" & val(78) & ";" & val(79) & ";" & val(80) & ";" & val(81) & ";" & val(82) & ";" & val(83) & ";" & val(84) & ";" & val(85) & ";" & val(86) & ";" & val(87) & ";" & val(88) & ";" & val(89) & ";" & val(90) & ";" & val(91) & ";" & val(92) & ";" & val(92) & ";" & val(94) & ";" & val(95) & ";" & val(96) & ";" & val(97) & ";" & val(98) & ";" & val(99) & ";" & val(100) & ";" & val(101) & ";" & val(102) & ";" & val(103) & ";" & val(104) & ";" & val(105) & ";" & val(106) & ";" & val(107) & ";" & val(108) & ";" & val(109) & ";" & val(110) & ";" & val(111) & ";" & val(112) & ";" & val(113) & ";" & val(114) & ";" & val(115) 
fso3.Close


End Sub